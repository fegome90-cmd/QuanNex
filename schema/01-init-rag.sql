-- =====================================================
-- RAG System Database Schema
-- =====================================================
-- Esquema completo para el sistema RAG con TaskDB
-- Incluye soporte para embeddings, metadatos y evidencia

-- =====================================================
-- EXTENSIONS
-- =====================================================

-- Habilitar extensiones necesarias
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS uuid-ossp;

-- =====================================================
-- TABLAS PRINCIPALES
-- =====================================================

-- Tabla de documentos/sources
CREATE TABLE IF NOT EXISTS rag_sources (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    uri TEXT NOT NULL UNIQUE,
    title TEXT,
    content_hash TEXT NOT NULL,
    content_type TEXT NOT NULL,
    size_bytes INTEGER,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    last_indexed_at TIMESTAMPTZ
);

-- Tabla de chunks/pedazos de documentos
CREATE TABLE IF NOT EXISTS rag_chunks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_id UUID NOT NULL REFERENCES rag_sources(id) ON DELETE CASCADE,
    chunk_index INTEGER NOT NULL,
    content TEXT NOT NULL,
    content_hash TEXT NOT NULL,
    token_count INTEGER,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Índices únicos
    UNIQUE(source_id, chunk_index)
);

-- Tabla de embeddings por modelo
CREATE TABLE IF NOT EXISTS rag_embeddings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    chunk_id UUID NOT NULL REFERENCES rag_chunks(id) ON DELETE CASCADE,
    model_id TEXT NOT NULL,
    model_version TEXT,
    embedding vector(1536), -- Dimension por defecto para text-embedding-3-small
    embedding_dim INTEGER NOT NULL DEFAULT 1536,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Índices únicos
    UNIQUE(chunk_id, model_id)
);

-- Tabla de evidencia (chunks pinneados/importantes)
CREATE TABLE IF NOT EXISTS rag_evidence (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    chunk_id UUID NOT NULL REFERENCES rag_chunks(id) ON DELETE CASCADE,
    evidence_type TEXT NOT NULL DEFAULT 'pinned', -- pinned, verified, expert_curated
    confidence_score FLOAT DEFAULT 1.0,
    source TEXT, -- PRP.lock, manual, algorithm
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ,
    
    -- Índices únicos
    UNIQUE(chunk_id, evidence_type)
);

-- Tabla de consultas y resultados
CREATE TABLE IF NOT EXISTS rag_queries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    query_text TEXT NOT NULL,
    query_hash TEXT NOT NULL,
    model_id TEXT,
    k INTEGER DEFAULT 10,
    filters JSONB DEFAULT '{}',
    results JSONB DEFAULT '[]',
    recall_score FLOAT,
    latency_ms INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabla de métricas de rendimiento
CREATE TABLE IF NOT EXISTS rag_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    metric_name TEXT NOT NULL,
    metric_value FLOAT NOT NULL,
    labels JSONB DEFAULT '{}',
    timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- ÍNDICES PARA RENDIMIENTO
-- =====================================================

-- Índices para búsquedas por URI y hash
CREATE INDEX IF NOT EXISTS idx_rag_sources_uri ON rag_sources(uri);
CREATE INDEX IF NOT EXISTS idx_rag_sources_content_hash ON rag_sources(content_hash);
CREATE INDEX IF NOT EXISTS idx_rag_sources_updated_at ON rag_sources(updated_at);

-- Índices para chunks
CREATE INDEX IF NOT EXISTS idx_rag_chunks_source_id ON rag_chunks(source_id);
CREATE INDEX IF NOT EXISTS idx_rag_chunks_content_hash ON rag_chunks(content_hash);
CREATE INDEX IF NOT EXISTS idx_rag_chunks_token_count ON rag_chunks(token_count);

-- Índices para embeddings (vector similarity search)
CREATE INDEX IF NOT EXISTS idx_rag_embeddings_model_id ON rag_embeddings(model_id);
CREATE INDEX IF NOT EXISTS idx_rag_embeddings_chunk_id ON rag_embeddings(chunk_id);
CREATE INDEX IF NOT EXISTS idx_rag_embeddings_vector ON rag_embeddings USING ivfflat (embedding vector_cosine_ops);

-- Índices para evidencia
CREATE INDEX IF NOT EXISTS idx_rag_evidence_chunk_id ON rag_evidence(chunk_id);
CREATE INDEX IF NOT EXISTS idx_rag_evidence_type ON rag_evidence(evidence_type);
CREATE INDEX IF NOT EXISTS idx_rag_evidence_expires_at ON rag_evidence(expires_at);

-- Índices para consultas
CREATE INDEX IF NOT EXISTS idx_rag_queries_query_hash ON rag_queries(query_hash);
CREATE INDEX IF NOT EXISTS idx_rag_queries_model_id ON rag_queries(model_id);
CREATE INDEX IF NOT EXISTS idx_rag_queries_created_at ON rag_queries(created_at);

-- Índices para métricas
CREATE INDEX IF NOT EXISTS idx_rag_metrics_name ON rag_metrics(metric_name);
CREATE INDEX IF NOT EXISTS idx_rag_metrics_timestamp ON rag_metrics(timestamp);

-- =====================================================
-- FUNCIONES UTILITARIAS
-- =====================================================

-- Función para calcular similitud coseno
CREATE OR REPLACE FUNCTION cosine_similarity(a vector, b vector)
RETURNS float AS $$
BEGIN
    RETURN 1 - (a <=> b);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Función para buscar chunks similares
CREATE OR REPLACE FUNCTION search_similar_chunks(
    query_embedding vector,
    model_id_param TEXT,
    k_param INTEGER DEFAULT 10,
    filters_param JSONB DEFAULT '{}'
)
RETURNS TABLE (
    chunk_id UUID,
    source_id UUID,
    content TEXT,
    similarity FLOAT,
    metadata JSONB
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        c.id as chunk_id,
        c.source_id,
        c.content,
        cosine_similarity(e.embedding, query_embedding) as similarity,
        c.metadata
    FROM rag_embeddings e
    JOIN rag_chunks c ON e.chunk_id = c.id
    JOIN rag_sources s ON c.source_id = s.id
    WHERE e.model_id = model_id_param
    ORDER BY e.embedding <=> query_embedding
    LIMIT k_param;
END;
$$ LANGUAGE plpgsql;

-- Función para limpiar datos obsoletos
CREATE OR REPLACE FUNCTION cleanup_old_rag_data(days_old INTEGER DEFAULT 30)
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    -- Eliminar métricas antiguas
    DELETE FROM rag_metrics 
    WHERE timestamp < NOW() - INTERVAL '1 day' * days_old;
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    -- Eliminar evidencia expirada
    DELETE FROM rag_evidence 
    WHERE expires_at IS NOT NULL AND expires_at < NOW();
    
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- TRIGGERS
-- =====================================================

-- Trigger para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Aplicar trigger a rag_sources
CREATE TRIGGER update_rag_sources_updated_at
    BEFORE UPDATE ON rag_sources
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- CONFIGURACIÓN INICIAL
-- =====================================================

-- Insertar configuración por defecto
INSERT INTO rag_metrics (metric_name, metric_value, labels) VALUES
('rag_system_initialized', 1.0, '{"version": "1.0", "initialized_at": "' || NOW()::TEXT || '"}')
ON CONFLICT DO NOTHING;

-- =====================================================
-- COMENTARIOS Y DOCUMENTACIÓN
-- =====================================================

COMMENT ON TABLE rag_sources IS 'Documentos y fuentes de datos para el sistema RAG';
COMMENT ON TABLE rag_chunks IS 'Fragmentos de documentos indexados';
COMMENT ON TABLE rag_embeddings IS 'Embeddings vectoriales de los chunks por modelo';
COMMENT ON TABLE rag_evidence IS 'Evidencia/contexto importante pinneado manualmente';
COMMENT ON TABLE rag_queries IS 'Historial de consultas y sus resultados';
COMMENT ON TABLE rag_metrics IS 'Métricas de rendimiento del sistema RAG';

COMMENT ON COLUMN rag_embeddings.embedding IS 'Vector de embeddings (dimensión variable según modelo)';
COMMENT ON COLUMN rag_evidence.confidence_score IS 'Puntuación de confianza (0.0-1.0)';
COMMENT ON COLUMN rag_queries.recall_score IS 'Puntuación de recall de la consulta';
COMMENT ON COLUMN rag_queries.latency_ms IS 'Latencia de la consulta en milisegundos';
