#!/usr/bin/env python3
"""
Hybrid Retriever - BM25 + Vector + Reranking
Implementa recuperación híbrida con fusión RRF y reranking
"""
import time
import hashlib
import logging
from typing import List, Dict, Any, Optional, Tuple
from dataclasses import dataclass
from collections import defaultdict

import openai
from qdrant_client import QdrantClient
from qdrant_client.models import Filter, FieldCondition, MatchValue
from sentence_transformers import CrossEncoder
import yaml

# Configurar logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

@dataclass
class Chunk:
    """Chunk de documento con metadatos"""
    content: str
    metadata: Dict[str, Any]
    score: float = 0.0
    retrieval_method: str = ""

class HybridRetriever:
    """Retriever híbrido BM25 + Vector + Reranking"""
    
    def __init__(self, config_path: str = "rag/config/retrieval.yaml"):
        # Cargar configuración
        with open(config_path, 'r') as f:
            self.config = yaml.safe_load(f)
        
        self.retrieval_config = self.config['retrieval']
        self.reranker_config = self.config['reranker']
        self.embeddings_config = self.config['embeddings']
        self.index_config = self.config['index']
        
        # Configurar clientes
        self._setup_clients()
        
        # Configurar BM25 (simulado con tf-idf básico)
        self.bm25_config = self.config.get('bm25', {})
        self.k1 = self.bm25_config.get('k1', 1.2)
        self.b = self.bm25_config.get('b', 0.75)
        
        # Configurar reranker
        self._setup_reranker()
        
        # Cache de embeddings
        self.embedding_cache = {}
    
    def _setup_clients(self):
        """Configura clientes de servicios externos"""
        # Qdrant
        self.qdrant_client = QdrantClient(url=self.index_config.get('url', 'http://localhost:6333'))
        self.collection_name = self.index_config['collection']
        
        # OpenAI
        self.openai_client = openai.OpenAI(
            api_key=self.embeddings_config.get('api_key')
        )
        self.embedding_model = self.embeddings_config['model']
        self.embedding_dimensions = self.embeddings_config['dimensions']
    
    def _setup_reranker(self):
        """Configura el modelo de reranking"""
        if self.reranker_config.get('enabled', False):
            model_name = self.reranker_config['model']
            try:
                self.reranker = CrossEncoder(model_name)
                logger.info(f"✅ Reranker loaded: {model_name}")
            except Exception as e:
                logger.error(f"❌ Error loading reranker: {e}")
                self.reranker = None
        else:
            self.reranker = None
            logger.info("Reranker disabled")
    
    def get_embedding(self, text: str) -> List[float]:
        """Obtiene embedding para un texto (con cache)"""
        # Cache key
        cache_key = hashlib.md5(text.encode()).hexdigest()
        
        if cache_key in self.embedding_cache:
            return self.embedding_cache[cache_key]
        
        try:
            response = self.openai_client.embeddings.create(
                model=self.embedding_model,
                input=text,
                dimensions=self.embedding_dimensions
            )
            embedding = response.data[0].embedding
            
            # Cachear
            self.embedding_cache[cache_key] = embedding
            
            return embedding
        except Exception as e:
            logger.error(f"Error getting embedding: {e}")
            raise
    
    def vector_search(self, query: str, k: int, filters: Optional[Dict] = None) -> List[Chunk]:
        """Búsqueda vectorial en Qdrant"""
        try:
            # Obtener embedding de la query
            query_embedding = self.get_embedding(query)
            
            # Construir filtros
            qdrant_filter = None
            if filters:
                conditions = []
                for key, value in filters.items():
                    conditions.append(
                        FieldCondition(
                            key=key,
                            match=MatchValue(value=value)
                        )
                    )
                qdrant_filter = Filter(must=conditions)
            
            # Buscar en Qdrant
            search_results = self.qdrant_client.search(
                collection_name=self.collection_name,
                query_vector=query_embedding,
                limit=k,
                query_filter=qdrant_filter
            )
            
            # Convertir a Chunks
            chunks = []
            for result in search_results:
                chunk = Chunk(
                    content=result.payload.get('content', ''),
                    metadata=result.payload,
                    score=result.score,
                    retrieval_method="vector"
                )
                chunks.append(chunk)
            
            logger.info(f"Vector search returned {len(chunks)} chunks")
            return chunks
            
        except Exception as e:
            logger.error(f"Error in vector search: {e}")
            return []
    
    def bm25_search(self, query: str, k: int, filters: Optional[Dict] = None) -> List[Chunk]:
        """Búsqueda BM25 (simulada)"""
        # Para simplificar, simulamos BM25 con búsqueda por texto
        # En producción usarías Elasticsearch o similar
        try:
            # Obtener todos los puntos (limitado para demo)
            scroll_results = self.qdrant_client.scroll(
                collection_name=self.collection_name,
                limit=1000,
                with_payload=True
            )
            
            # Simular scoring BM25
            query_terms = query.lower().split()
            scored_chunks = []
            
            for point in scroll_results[0]:
                content = point.payload.get('content', '').lower()
                
                # Calcular score BM25 simplificado
                score = 0.0
                for term in query_terms:
                    term_freq = content.count(term)
                    if term_freq > 0:
                        # TF-IDF simplificado
                        score += term_freq / (term_freq + self.k1 * (1 - self.b + self.b * len(content.split()) / 100))
                
                if score > 0:
                    chunk = Chunk(
                        content=point.payload.get('content', ''),
                        metadata=point.payload,
                        score=score,
                        retrieval_method="bm25"
                    )
                    scored_chunks.append(chunk)
            
            # Ordenar por score y tomar top-k
            scored_chunks.sort(key=lambda x: x.score, reverse=True)
            chunks = scored_chunks[:k]
            
            logger.info(f"BM25 search returned {len(chunks)} chunks")
            return chunks
            
        except Exception as e:
            logger.error(f"Error in BM25 search: {e}")
            return []
    
    def reciprocal_rank_fusion(self, vector_chunks: List[Chunk], bm25_chunks: List[Chunk], k: int = 60) -> List[Chunk]:
        """Fusión RRF (Reciprocal Rank Fusion)"""
        # Crear mapas de contenido a score
        vector_scores = {}
        bm25_scores = {}
        
        for i, chunk in enumerate(vector_chunks):
            content_key = chunk.content[:100]  # Usar inicio del contenido como key
            vector_scores[content_key] = 1.0 / (k + i + 1)
        
        for i, chunk in enumerate(bm25_chunks):
            content_key = chunk.content[:100]
            bm25_scores[content_key] = 1.0 / (k + i + 1)
        
        # Fusionar scores
        fused_scores = defaultdict(float)
        all_chunks = {}
        
        # Agregar chunks vectoriales
        for chunk in vector_chunks:
            content_key = chunk.content[:100]
            fused_scores[content_key] += vector_scores[content_key]
            all_chunks[content_key] = chunk
        
        # Agregar chunks BM25
        for chunk in bm25_chunks:
            content_key = chunk.content[:100]
            fused_scores[content_key] += bm25_scores[content_key]
            if content_key not in all_chunks:
                all_chunks[content_key] = chunk
        
        # Ordenar por score fusionado
        sorted_chunks = sorted(
            all_chunks.items(),
            key=lambda x: fused_scores[x[0]],
            reverse=True
        )
        
        # Crear chunks fusionados
        fused_chunks = []
        for content_key, chunk in sorted_chunks:
            fused_chunk = Chunk(
                content=chunk.content,
                metadata=chunk.metadata,
                score=fused_scores[content_key],
                retrieval_method="hybrid_rrf"
            )
            fused_chunks.append(fused_chunk)
        
        logger.info(f"RRF fusion returned {len(fused_chunks)} chunks")
        return fused_chunks
    
    def rerank_chunks(self, query: str, chunks: List[Chunk], top_k: int) -> List[Chunk]:
        """Rerankea chunks usando modelo de reranking"""
        if not self.reranker or not chunks:
            return chunks[:top_k]
        
        try:
            # Preparar pares query-chunk para reranking
            pairs = []
            for chunk in chunks:
                pairs.append([query, chunk.content])
            
            # Reranking
            rerank_scores = self.reranker.predict(pairs)
            
            # Actualizar scores y ordenar
            reranked_chunks = []
            for chunk, score in zip(chunks, rerank_scores):
                chunk.score = float(score)
                chunk.retrieval_method = f"{chunk.retrieval_method}_reranked"
                reranked_chunks.append(chunk)
            
            # Ordenar por score de reranking
            reranked_chunks.sort(key=lambda x: x.score, reverse=True)
            
            logger.info(f"Reranking returned {len(reranked_chunks)} chunks")
            return reranked_chunks[:top_k]
            
        except Exception as e:
            logger.error(f"Error in reranking: {e}")
            return chunks[:top_k]
    
    def retrieve(self, query: str, k: int = None, filters: Optional[Dict] = None) -> List[Chunk]:
        """Método principal de recuperación híbrida"""
        if k is None:
            k = self.retrieval_config.get('top_k_vector', 12)
        
        start_time = time.time()
        
        # Búsquedas paralelas
        vector_k = self.retrieval_config.get('top_k_vector', 12)
        bm25_k = self.retrieval_config.get('top_k_bm25', 12)
        
        # Vector search
        vector_chunks = self.vector_search(query, vector_k, filters)
        
        # BM25 search
        bm25_chunks = self.bm25_search(query, bm25_k, filters)
        
        # Fusión RRF
        fusion_k = self.retrieval_config.get('fusion_k', 60)
        fused_chunks = self.reciprocal_rank_fusion(vector_chunks, bm25_chunks, fusion_k)
        
        # Reranking
        rerank_top_k = self.reranker_config.get('top_k', 8)
        final_chunks = self.rerank_chunks(query, fused_chunks, rerank_top_k)
        
        end_time = time.time()
        retrieval_time = (end_time - start_time) * 1000  # ms
        
        logger.info(f"Retrieval completed in {retrieval_time:.1f}ms")
        
        return final_chunks
    
    def explain(self, query: str, k: int = None, filters: Optional[Dict] = None) -> Dict[str, Any]:
        """Explica el proceso de recuperación"""
        if k is None:
            k = self.retrieval_config.get('top_k_vector', 12)
        
        vector_k = self.retrieval_config.get('top_k_vector', 12)
        bm25_k = self.retrieval_config.get('top_k_bm25', 12)
        
        # Ejecutar recuperación paso a paso
        vector_chunks = self.vector_search(query, vector_k, filters)
        bm25_chunks = self.bm25_search(query, bm25_k, filters)
        
        fusion_k = self.retrieval_config.get('fusion_k', 60)
        fused_chunks = self.reciprocal_rank_fusion(vector_chunks, bm25_chunks, fusion_k)
        
        rerank_top_k = self.reranker_config.get('top_k', 8)
        final_chunks = self.rerank_chunks(query, fused_chunks, rerank_top_k)
        
        return {
            "query": query,
            "bm25_hits": [
                {
                    "content": chunk.content[:200] + "...",
                    "score": chunk.score,
                    "metadata": chunk.metadata
                }
                for chunk in bm25_chunks[:5]
            ],
            "vector_hits": [
                {
                    "content": chunk.content[:200] + "...",
                    "score": chunk.score,
                    "metadata": chunk.metadata
                }
                for chunk in vector_chunks[:5]
            ],
            "fused": [
                {
                    "content": chunk.content[:200] + "...",
                    "score": chunk.score,
                    "metadata": chunk.metadata
                }
                for chunk in fused_chunks[:5]
            ],
            "rerank_scores": [
                {
                    "content": chunk.content[:200] + "...",
                    "score": chunk.score,
                    "metadata": chunk.metadata
                }
                for chunk in final_chunks
            ],
            "total_results": len(final_chunks)
        }

# Para uso como módulo
def create_retriever(config_path: str = "rag/config/retrieval.yaml") -> HybridRetriever:
    """Factory function para crear retriever"""
    return HybridRetriever(config_path)

if __name__ == "__main__":
    # Test básico
    retriever = HybridRetriever()
    
    query = "¿Qué es TaskDB?"
    chunks = retriever.retrieve(query, k=5)
    
    print(f"Query: {query}")
    print(f"Results: {len(chunks)}")
    for i, chunk in enumerate(chunks):
        print(f"{i+1}. Score: {chunk.score:.3f} | Method: {chunk.retrieval_method}")
        print(f"   Content: {chunk.content[:100]}...")
        print()
