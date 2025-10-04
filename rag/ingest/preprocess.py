#!/usr/bin/env python3
"""
Preprocessor para documentos RAG - Limpieza y preparación de contenido
Limpia MD/HTML, quita navegación, TOCs duplicados, y normaliza metadatos
"""
import re
import hashlib
import argparse
from pathlib import Path
from typing import Dict, List, Any, Optional
import frontmatter
import markdown

class DocumentPreprocessor:
    """Preprocesador de documentos para pipeline RAG"""
    
    def __init__(self, config: Dict[str, Any]):
        self.config = config
        self.chunking_config = config.get('chunking', {})
        self.max_chars = self.chunking_config.get('max_chars', 1200)
        self.overlap = self.chunking_config.get('overlap', 120)
        self.separators = self.chunking_config.get('separators', ['\n\n', '\n', '. ', ' ', ''])
        
        # Regex patterns para limpieza
        self.cleanup_patterns = [
            # Navegación y TOCs
            (r'^#{1,6}\s*(Table of Contents?|Contents?|Índice|TOC).*$', '', re.MULTILINE | re.IGNORECASE),
            (r'^\s*[-*]\s*\[.*?\]\(#.*?\).*$', '', re.MULTILINE),  # TOC links
            (r'^\s*\d+\.\s*\[.*?\]\(#.*?\).*$', '', re.MULTILINE),  # Numbered TOC
            
            # Navegación común
            (r'^#{1,6}\s*(Navigation|Nav|Menu).*$', '', re.MULTILINE | re.IGNORECASE),
            (r'^#{1,6}\s*(Back to top|Return to top|↑).*$', '', re.MULTILINE | re.IGNORECASE),
            
            # Enlaces de navegación
            (r'\[← Back\]\(.*?\)', '', re.IGNORECASE),
            (r'\[Next →\]\(.*?\)', '', re.IGNORECASE),
            (r'\[Previous\]\(.*?\)', '', re.IGNORECASE),
            (r'\[Continue\]\(.*?\)', '', re.IGNORECASE),
            
            # Metadatos HTML
            (r'<meta.*?>', '', re.IGNORECASE),
            (r'<link.*?>', '', re.IGNORECASE),
            (r'<script.*?</script>', '', re.DOTALL | re.IGNORECASE),
            (r'<style.*?</style>', '', re.DOTALL | re.IGNORECASE),
            
            # Líneas vacías múltiples
            (r'\n\s*\n\s*\n', '\n\n', re.MULTILINE),
            
            # Caracteres de control
            (r'[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]', '', re.MULTILINE),
        ]
    
    def clean_content(self, content: str) -> str:
        """Limpia el contenido del documento"""
        for pattern, replacement, flags in self.cleanup_patterns:
            content = re.sub(pattern, replacement, content, flags=flags)
        
        # Limpieza final
        content = content.strip()
        
        # Normalizar espacios
        content = re.sub(r'[ \t]+', ' ', content)
        content = re.sub(r'\n ', '\n', content)
        
        return content
    
    def extract_metadata(self, file_path: Path, content: str) -> Dict[str, Any]:
        """Extrae metadatos del documento"""
        # Intentar extraer frontmatter
        try:
            post = frontmatter.loads(content)
            metadata = post.metadata.copy()
            content = post.content
        except:
            metadata = {}
        
        # Metadatos del archivo
        stat = file_path.stat()
        
        # Generar hash del contenido
        content_hash = hashlib.sha256(content.encode('utf-8')).hexdigest()
        
        # Extraer sección del path
        section = str(file_path.parent.relative_to(file_path.anchor))
        if section == '.':
            section = 'root'
        
        return {
            'doc_id': str(file_path),
            'section': section,
            'filename': file_path.name,
            'file_size': stat.st_size,
            'created_at': stat.st_ctime,
            'modified_at': stat.st_mtime,
            'content_hash': content_hash,
            'doc_type': 'markdown',
            **metadata  # Frontmatter metadata
        }
    
    def semantic_chunk(self, content: str, metadata: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Chunking semántico del contenido"""
        chunks = []
        
        # Estrategia: dividir por separadores jerárquicos
        text = content
        
        # Primero dividir por párrafos dobles
        paragraphs = re.split(r'\n\s*\n', text)
        
        current_chunk = ""
        chunk_idx = 0
        
        for paragraph in paragraphs:
            paragraph = paragraph.strip()
            if not paragraph:
                continue
            
            # Si agregar este párrafo excede el límite, crear chunk actual
            if current_chunk and len(current_chunk) + len(paragraph) + 2 > self.max_chars:
                if current_chunk:
                    chunks.append(self._create_chunk(current_chunk, chunk_idx, metadata))
                    chunk_idx += 1
                    current_chunk = paragraph
                else:
                    # Párrafo muy largo, dividir por oraciones
                    sentences = re.split(r'[.!?]+\s+', paragraph)
                    for sentence in sentences:
                        if len(current_chunk) + len(sentence) + 1 > self.max_chars:
                            if current_chunk:
                                chunks.append(self._create_chunk(current_chunk, chunk_idx, metadata))
                                chunk_idx += 1
                                current_chunk = sentence
                            else:
                                # Oración muy larga, truncar
                                chunks.append(self._create_chunk(sentence[:self.max_chars], chunk_idx, metadata))
                                chunk_idx += 1
                        else:
                            current_chunk += (" " if current_chunk else "") + sentence
            else:
                current_chunk += ("\n\n" if current_chunk else "") + paragraph
        
        # Agregar último chunk si existe
        if current_chunk:
            chunks.append(self._create_chunk(current_chunk, chunk_idx, metadata))
        
        return chunks
    
    def _create_chunk(self, content: str, chunk_idx: int, metadata: Dict[str, Any]) -> Dict[str, Any]:
        """Crea un chunk con metadatos"""
        chunk_metadata = metadata.copy()
        chunk_metadata.update({
            'chunk_idx': chunk_idx,
            'chunk_size': len(content),
            'chunk_hash': hashlib.sha256(content.encode('utf-8')).hexdigest()
        })
        
        return {
            'content': content,
            'metadata': chunk_metadata
        }
    
    def process_file(self, file_path: Path) -> List[Dict[str, Any]]:
        """Procesa un archivo individual"""
        try:
            # Leer archivo
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read()
            
            # Limpiar contenido
            cleaned_content = self.clean_content(content)
            
            # Extraer metadatos
            metadata = self.extract_metadata(file_path, cleaned_content)
            
            # Chunking semántico
            chunks = self.semantic_chunk(cleaned_content, metadata)
            
            print(f"✅ Processed {file_path}: {len(chunks)} chunks")
            return chunks
            
        except Exception as e:
            print(f"❌ Error processing {file_path}: {e}")
            return []
    
    def process_directory(self, source_dir: Path) -> List[Dict[str, Any]]:
        """Procesa todos los archivos en un directorio"""
        all_chunks = []
        
        # Buscar archivos según configuración
        patterns = ['**/*.md', '**/*.markdown', '**/*.txt']
        
        for pattern in patterns:
            for file_path in source_dir.glob(pattern):
                if file_path.is_file():
                    chunks = self.process_file(file_path)
                    all_chunks.extend(chunks)
        
        print(f"📊 Total processed: {len(all_chunks)} chunks from {source_dir}")
        return all_chunks

def main():
    parser = argparse.ArgumentParser(description="RAG Document Preprocessor")
    parser.add_argument("--source", required=True, help="Source directory")
    parser.add_argument("--output", required=True, help="Output JSON file")
    parser.add_argument("--config", default="rag/config/retrieval.yaml", help="Config file")
    
    args = parser.parse_args()
    
    # Cargar configuración
    import yaml
    with open(args.config, 'r') as f:
        config = yaml.safe_load(f)
    
    # Procesar documentos
    preprocessor = DocumentPreprocessor(config)
    source_dir = Path(args.source)
    
    if not source_dir.exists():
        print(f"❌ Source directory not found: {source_dir}")
        return 1
    
    chunks = preprocessor.process_directory(source_dir)
    
    # Guardar resultados
    import json
    with open(args.output, 'w') as f:
        json.dump(chunks, f, indent=2)
    
    print(f"💾 Saved {len(chunks)} chunks to {args.output}")
    return 0

if __name__ == "__main__":
    exit(main())
