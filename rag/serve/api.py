#!/usr/bin/env python3
"""
FastAPI Server para RAG Pipeline
Endpoint local para smoke CI y testing
"""
import time
import logging
from typing import Dict, Any, Optional, List
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import uvicorn

from .retriever import HybridRetriever, create_retriever

# Configurar logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Global retriever instance
retriever: Optional[HybridRetriever] = None

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Lifespan manager para inicializar el retriever"""
    global retriever
    try:
        logger.info("Initializing RAG retriever...")
        retriever = create_retriever()
        logger.info("✅ RAG retriever initialized")
        yield
    except Exception as e:
        logger.error(f"❌ Error initializing retriever: {e}")
        raise
    finally:
        logger.info("Shutting down RAG retriever...")

# FastAPI app
app = FastAPI(
    title="RAG Pipeline API",
    description="API para pipeline RAG con recuperación híbrida",
    version="1.0.0",
    lifespan=lifespan
)

# Pydantic models
class QueryRequest(BaseModel):
    query: str
    k: Optional[int] = None
    filters: Optional[Dict[str, Any]] = None
    explain: Optional[bool] = False

class QueryResponse(BaseModel):
    query: str
    answer: Optional[str] = None
    contexts: List[Dict[str, Any]]
    timings_ms: Dict[str, float]
    metadata: Dict[str, Any]

class HealthResponse(BaseModel):
    status: str
    retriever_ready: bool
    collection_info: Optional[Dict[str, Any]] = None

@app.get("/health", response_model=HealthResponse)
async def health_check():
    """Health check endpoint"""
    global retriever
    
    try:
        if retriever:
            # Verificar que la colección existe
            collection_info = retriever.get_collection_info()
            return HealthResponse(
                status="healthy",
                retriever_ready=True,
                collection_info=collection_info
            )
        else:
            return HealthResponse(
                status="unhealthy",
                retriever_ready=False
            )
    except Exception as e:
        logger.error(f"Health check failed: {e}")
        return HealthResponse(
            status="unhealthy",
            retriever_ready=False
        )

@app.post("/query", response_model=QueryResponse)
async def query_rag(request: QueryRequest):
    """Endpoint principal de consulta RAG"""
    global retriever
    
    if not retriever:
        raise HTTPException(status_code=503, detail="Retriever not initialized")
    
    start_time = time.time()
    
    try:
        # Recuperación
        retrieval_start = time.time()
        chunks = retriever.retrieve(
            query=request.query,
            k=request.k,
            filters=request.filters
        )
        retrieval_time = (time.time() - retrieval_start) * 1000
        
        # Preparar contextos
        contexts = []
        for chunk in chunks:
            contexts.append({
                "content": chunk.content,
                "score": chunk.score,
                "retrieval_method": chunk.retrieval_method,
                "metadata": chunk.metadata
            })
        
        # Generar respuesta simple (en producción usarías un LLM)
        answer = None
        if contexts:
            # Respuesta básica basada en el mejor contexto
            best_context = contexts[0]["content"]
            answer = f"Basado en la documentación: {best_context[:200]}..."
        
        total_time = (time.time() - start_time) * 1000
        
        return QueryResponse(
            query=request.query,
            answer=answer,
            contexts=contexts,
            timings_ms={
                "retrieval": retrieval_time,
                "total": total_time
            },
            metadata={
                "num_contexts": len(contexts),
                "retriever_config": {
                    "hybrid": True,
                    "reranking": retriever.reranker is not None
                }
            }
        )
        
    except Exception as e:
        logger.error(f"Query failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/explain")
async def explain_query(request: QueryRequest):
    """Endpoint para explicar el proceso de recuperación"""
    global retriever
    
    if not retriever:
        raise HTTPException(status_code=503, detail="Retriever not initialized")
    
    try:
        explanation = retriever.explain(
            query=request.query,
            k=request.k,
            filters=request.filters
        )
        return explanation
        
    except Exception as e:
        logger.error(f"Explain failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/stats")
async def get_stats():
    """Estadísticas del sistema"""
    global retriever
    
    if not retriever:
        raise HTTPException(status_code=503, detail="Retriever not initialized")
    
    try:
        collection_info = retriever.get_collection_info()
        
        return {
            "collection": {
                "name": retriever.collection_name,
                **collection_info
            },
            "config": {
                "hybrid_retrieval": True,
                "reranking_enabled": retriever.reranker is not None,
                "embedding_model": retriever.embedding_model,
                "embedding_dimensions": retriever.embedding_dimensions
            },
            "cache": {
                "embedding_cache_size": len(retriever.embedding_cache)
            }
        }
        
    except Exception as e:
        logger.error(f"Stats failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "message": "RAG Pipeline API",
        "version": "1.0.0",
        "endpoints": {
            "health": "/health",
            "query": "/query",
            "explain": "/explain",
            "stats": "/stats",
            "docs": "/docs"
        }
    }

def main():
    """Main function para ejecutar el servidor"""
    import argparse
    
    parser = argparse.ArgumentParser(description="RAG Pipeline API Server")
    parser.add_argument("--host", default="0.0.0.0", help="Host to bind to")
    parser.add_argument("--port", type=int, default=8000, help="Port to bind to")
    parser.add_argument("--config", default="rag/config/retrieval.yaml", help="Config file")
    parser.add_argument("--reload", action="store_true", help="Enable auto-reload")
    parser.add_argument("--log-level", default="info", help="Log level")
    
    args = parser.parse_args()
    
    logger.info(f"Starting RAG Pipeline API on {args.host}:{args.port}")
    logger.info(f"Config file: {args.config}")
    
    uvicorn.run(
        "api:app",
        host=args.host,
        port=args.port,
        reload=args.reload,
        log_level=args.log_level
    )

if __name__ == "__main__":
    main()
