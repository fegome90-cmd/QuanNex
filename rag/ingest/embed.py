#!/usr/bin/env python3
"""
Embedding Pipeline - Crea/actualiza colección réplica con embeddings
Genera embeddings y upserta a Qdrant con logging completo
"""
import json
import hashlib
import argparse
import logging
from pathlib import Path
from typing import Dict, List, Any, Optional
from datetime import datetime

import openai
from qdrant_client import QdrantClient
from qdrant_client.models import Distance, VectorParams, PointStruct

# Configurar logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

class EmbeddingPipeline:
    """Pipeline de embeddings para RAG"""
    
    def __init__(self, config: Dict[str, Any]):
        self.config = config
        self.embeddings_config = config.get('embeddings', {})
        self.index_config = config.get('index', {})
        
        # Configuración OpenAI
        self.openai_client = openai.OpenAI(
            api_key=self.embeddings_config.get('api_key') or openai.api_key
        )
        self.model = self.embeddings_config.get('model', 'text-embedding-3-small')
        self.dimensions = self.embeddings_config.get('dimensions', 1536)
        
        # Configuración Qdrant
        self.qdrant_url = self.index_config.get('url', 'http://localhost:6333')
        self.collection_name = self.index_config.get('collection', 'quannex_docs_replica')
        
        self.qdrant_client = QdrantClient(url=self.qdrant_url)
        
        # Configuración de batch
        self.batch_size = self.embeddings_config.get('batch_size', 100)
        self.rate_limit = self.embeddings_config.get('rate_limit', 3000)  # requests per minute
        
        # Logging de upserts
        self.upsert_log = []
    
    def generate_embedding(self, text: str) -> List[float]:
        """Genera embedding para un texto"""
        try:
            response = self.openai_client.embeddings.create(
                model=self.model,
                input=text,
                dimensions=self.dimensions
            )
            return response.data[0].embedding
        except Exception as e:
            logger.error(f"Error generating embedding: {e}")
            raise
    
    def generate_embeddings_batch(self, texts: List[str]) -> List[List[float]]:
        """Genera embeddings en batch para múltiples textos"""
        try:
            response = self.openai_client.embeddings.create(
                model=self.model,
                input=texts,
                dimensions=self.dimensions
            )
            return [data.embedding for data in response.data]
        except Exception as e:
            logger.error(f"Error generating batch embeddings: {e}")
            raise
    
    def create_collection(self):
        """Crea la colección en Qdrant si no existe"""
        try:
            collections = self.qdrant_client.get_collections()
            collection_names = [c.name for c in collections.collections]
            
            if self.collection_name not in collection_names:
                logger.info(f"Creating collection: {self.collection_name}")
                self.qdrant_client.create_collection(
                    collection_name=self.collection_name,
                    vectors_config=VectorParams(
                        size=self.dimensions,
                        distance=Distance.COSINE
                    )
                )
                logger.info(f"✅ Collection {self.collection_name} created")
            else:
                logger.info(f"Collection {self.collection_name} already exists")
                
        except Exception as e:
            logger.error(f"Error creating collection: {e}")
            raise
    
    def upsert_chunks(self, chunks: List[Dict[str, Any]], replica_tag: str = None) -> Dict[str, Any]:
        """Upserta chunks a la colección réplica"""
        if not chunks:
            logger.warning("No chunks to upsert")
            return {"upserted": 0, "errors": 0}
        
        # Crear tag de réplica si no se proporciona
        if not replica_tag:
            replica_tag = f"ci-{datetime.now().strftime('%Y%m%d-%H%M%S')}"
        
        logger.info(f"Starting upsert of {len(chunks)} chunks with tag: {replica_tag}")
        
        upserted_count = 0
        error_count = 0
        
        # Procesar en batches
        for i in range(0, len(chunks), self.batch_size):
            batch = chunks[i:i + self.batch_size]
            batch_texts = [chunk['content'] for chunk in batch]
            
            try:
                # Generar embeddings para el batch
                logger.info(f"Generating embeddings for batch {i//self.batch_size + 1}")
                embeddings = self.generate_embeddings_batch(batch_texts)
                
                # Crear puntos para Qdrant
                points = []
                for j, (chunk, embedding) in enumerate(zip(batch, embeddings)):
                    # Generar ID único
                    point_id = self._generate_point_id(chunk, replica_tag)
                    
                    # Metadatos del chunk
                    metadata = chunk['metadata'].copy()
                    metadata['replica_tag'] = replica_tag
                    metadata['upserted_at'] = datetime.now().isoformat()
                    
                    point = PointStruct(
                        id=point_id,
                        vector=embedding,
                        payload=metadata
                    )
                    points.append(point)
                
                # Upsert a Qdrant
                logger.info(f"Upserting batch {i//self.batch_size + 1} ({len(points)} points)")
                self.qdrant_client.upsert(
                    collection_name=self.collection_name,
                    points=points
                )
                
                upserted_count += len(points)
                
                # Log de upsert
                for chunk, point in zip(batch, points):
                    self.upsert_log.append({
                        'point_id': point.id,
                        'doc_id': chunk['metadata']['doc_id'],
                        'chunk_idx': chunk['metadata']['chunk_idx'],
                        'replica_tag': replica_tag,
                        'content_hash': chunk['metadata']['chunk_hash'],
                        'upserted_at': metadata['upserted_at']
                    })
                
                logger.info(f"✅ Batch {i//self.batch_size + 1} upserted successfully")
                
            except Exception as e:
                logger.error(f"❌ Error upserting batch {i//self.batch_size + 1}: {e}")
                error_count += len(batch)
        
        result = {
            "upserted": upserted_count,
            "errors": error_count,
            "replica_tag": replica_tag,
            "collection": self.collection_name,
            "upserted_at": datetime.now().isoformat()
        }
        
        logger.info(f"📊 Upsert completed: {upserted_count} successful, {error_count} errors")
        return result
    
    def _generate_point_id(self, chunk: Dict[str, Any], replica_tag: str) -> str:
        """Genera ID único para el punto"""
        doc_id = chunk['metadata']['doc_id']
        chunk_idx = chunk['metadata']['chunk_idx']
        content_hash = chunk['metadata']['chunk_hash']
        
        # Crear ID único combinando doc_id, chunk_idx, replica_tag y hash
        id_string = f"{doc_id}:{chunk_idx}:{replica_tag}:{content_hash}"
        return hashlib.md5(id_string.encode()).hexdigest()
    
    def save_upsert_log(self, output_path: str):
        """Guarda el log de upserts"""
        log_data = {
            "summary": {
                "total_upserts": len(self.upsert_log),
                "timestamp": datetime.now().isoformat()
            },
            "upserts": self.upsert_log
        }
        
        with open(output_path, 'w') as f:
            json.dump(log_data, f, indent=2)
        
        logger.info(f"💾 Upsert log saved to {output_path}")
    
    def get_collection_info(self) -> Dict[str, Any]:
        """Obtiene información de la colección"""
        try:
            collection_info = self.qdrant_client.get_collection(self.collection_name)
            return {
                "name": collection_info.config.params.vectors.size,
                "vectors_count": collection_info.vectors_count,
                "points_count": collection_info.points_count,
                "status": collection_info.status
            }
        except Exception as e:
            logger.error(f"Error getting collection info: {e}")
            return {}

def main():
    parser = argparse.ArgumentParser(description="RAG Embedding Pipeline")
    parser.add_argument("--chunks", required=True, help="Input chunks JSON file")
    parser.add_argument("--output", required=True, help="Output upsert log JSON file")
    parser.add_argument("--config", default="rag/config/retrieval.yaml", help="Config file")
    parser.add_argument("--replica-tag", help="Replica tag (auto-generated if not provided)")
    parser.add_argument("--api-key", help="OpenAI API key")
    
    args = parser.parse_args()
    
    # Cargar configuración
    import yaml
    with open(args.config, 'r') as f:
        config = yaml.safe_load(f)
    
    # Override API key si se proporciona
    if args.api_key:
        config['embeddings']['api_key'] = args.api_key
    
    # Cargar chunks
    with open(args.chunks, 'r') as f:
        chunks = json.load(f)
    
    # Crear pipeline
    pipeline = EmbeddingPipeline(config)
    
    # Crear colección
    pipeline.create_collection()
    
    # Upsert chunks
    result = pipeline.upsert_chunks(chunks, args.replica_tag)
    
    # Guardar log
    pipeline.save_upsert_log(args.output)
    
    # Mostrar resumen
    collection_info = pipeline.get_collection_info()
    
    print("\n📊 Embedding Pipeline Results:")
    print(f"   Chunks processed: {len(chunks)}")
    print(f"   Upserted: {result['upserted']}")
    print(f"   Errors: {result['errors']}")
    print(f"   Replica tag: {result['replica_tag']}")
    print(f"   Collection: {result['collection']}")
    
    if collection_info:
        print(f"   Collection vectors: {collection_info.get('vectors_count', 'unknown')}")
        print(f"   Collection points: {collection_info.get('points_count', 'unknown')}")
    
    return 0 if result['errors'] == 0 else 1

if __name__ == "__main__":
    exit(main())
