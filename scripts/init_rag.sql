-- =====================================================
-- Inicialización del Sistema RAG - PostgreSQL + pgvector
-- =====================================================

-- Habilitar extensión vector
CREATE EXTENSION IF NOT EXISTS vector;

-- Tabla de chunks RAG (resiliente a multi-modelo)
CREATE TABLE IF NOT EXISTS rag_chunks (
  id            bigserial PRIMARY KEY,
  uri           text NOT NULL,
  chunk_idx     int  NOT NULL,
  content       text NOT NULL,
  hash          text NOT NULL,
  model_id      text NOT NULL,
  embedding_dim int  NOT NULL,
  embedding     vector,                -- se asigna con dimensión en INSERT
  meta          jsonb DEFAULT '{}'::jsonb,
  ttl_days      int   DEFAULT 0,
  created_at    timestamptz DEFAULT now(),
  updated_at    timestamptz DEFAULT now(),
  
  -- Índices únicos
  UNIQUE(uri, chunk_idx, model_id)
);

-- Índices útiles
CREATE INDEX IF NOT EXISTS idx_rag_uri ON rag_chunks(uri);
CREATE INDEX IF NOT EXISTS idx_rag_model ON rag_chunks(model_id);
CREATE INDEX IF NOT EXISTS idx_rag_updated ON rag_chunks(updated_at);
CREATE INDEX IF NOT EXISTS idx_rag_embedding ON rag_chunks USING ivfflat (embedding vector_cosine_ops);

-- Trigger de updated_at
CREATE OR REPLACE FUNCTION set_updated_at() RETURNS trigger AS $$
BEGIN 
  NEW.updated_at = now(); 
  RETURN NEW; 
END; 
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_set_updated ON rag_chunks;
CREATE TRIGGER trg_set_updated BEFORE UPDATE ON rag_chunks
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Función para búsqueda de similitud coseno
CREATE OR REPLACE FUNCTION cosine_similarity(a vector, b vector)
RETURNS float AS $$
BEGIN
    RETURN 1 - (a <=> b);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Función para buscar chunks similares
CREATE OR REPLACE FUNCTION search_similar_chunks(
    query_embedding vector,
    model_id_param text,
    k_param int DEFAULT 10
)
RETURNS TABLE (
    id bigint,
    uri text,
    chunk_idx int,
    content text,
    similarity float,
    meta jsonb
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        c.id,
        c.uri,
        c.chunk_idx,
        c.content,
        cosine_similarity(c.embedding, query_embedding) as similarity,
        c.meta
    FROM rag_chunks c
    WHERE c.model_id = model_id_param
      AND c.embedding IS NOT NULL
    ORDER BY c.embedding <=> query_embedding
    LIMIT k_param;
END;
$$ LANGUAGE plpgsql;

-- Insertar datos de prueba
INSERT INTO rag_chunks (uri, chunk_idx, content, hash, model_id, embedding_dim, embedding)
VALUES 
    ('demo://hello', 0, 'Hola mundo RAG', 'hash-demo-1', 'demo-emb-4d', 4, '[0.1,0.2,0.3,0.4]'),
    ('demo://test', 0, 'Este es un chunk de prueba para el sistema RAG', 'hash-demo-2', 'demo-emb-4d', 4, '[0.2,0.3,0.4,0.5]'),
    ('demo://example', 0, 'Ejemplo de contenido con información relevante', 'hash-demo-3', 'demo-emb-4d', 4, '[0.3,0.4,0.5,0.6]')
ON CONFLICT (uri, chunk_idx, model_id) DO NOTHING;

-- Mostrar información de la tabla
SELECT 'Tabla rag_chunks creada exitosamente' as status;
SELECT count(*) as total_chunks FROM rag_chunks;
SELECT model_id, embedding_dim, count(*) as chunks_count 
FROM rag_chunks 
GROUP BY model_id, embedding_dim;
