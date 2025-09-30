#!/usr/bin/env python3
"""
Extractor de DOIs - Motor RETE WCAI2-ALFA
Extrae DOIs faltantes de múltiples fuentes para completar la base de datos
"""

import json
import pandas as pd
import re
import requests
import time
from typing import Dict, List, Optional
import logging

# Configurar logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class DOIExtractor:
    """Extractor de DOIs de múltiples fuentes"""
    
    def __init__(self):
        self.headers = {
            'User-Agent': 'DOIExtractor/1.0 (mailto:felipe@wcai2alfa.com)'
        }
    
    def extract_doi_from_title(self, title: str) -> Optional[str]:
        """Extrae DOI del título si está presente"""
        # Patrones comunes de DOI en títulos
        patterns = [
            r'doi:?\s*([^\s]+)',
            r'DOI:?\s*([^\s]+)',
            r'https?://doi\.org/([^\s]+)',
            r'https?://dx\.doi\.org/([^\s]+)'
        ]
        
        for pattern in patterns:
            match = re.search(pattern, title, re.IGNORECASE)
            if match:
                return match.group(1)
        return None
    
    def extract_doi_from_abstract(self, abstract: str) -> Optional[str]:
        """Extrae DOI del abstract si está presente"""
        # Patrones comunes de DOI en abstracts
        patterns = [
            r'doi:?\s*([^\s]+)',
            r'DOI:?\s*([^\s]+)',
            r'https?://doi\.org/([^\s]+)',
            r'https?://dx\.doi\.org/([^\s]+)',
            r'doi\.org/([^\s]+)',
            r'dx\.doi\.org/([^\s]+)'
        ]
        
        for pattern in patterns:
            match = re.search(pattern, abstract, re.IGNORECASE)
            if match:
                return match.group(1)
        return None
    
    def search_doi_by_title(self, title: str) -> Optional[str]:
        """Busca DOI por título usando APIs externas"""
        try:
            # Buscar en CrossRef
            url = "https://api.crossref.org/works"
            params = {
                'query': title[:200],  # Limitar longitud
                'rows': 1
            }
            
            response = requests.get(url, params=params, headers=self.headers, timeout=10)
            if response.status_code == 200:
                data = response.json()
                if data.get('message', {}).get('items'):
                    item = data['message']['items'][0]
                    if 'DOI' in item:
                        return item['DOI']
            
            time.sleep(0.5)  # Rate limiting
            
        except Exception as e:
            logger.debug(f"Error buscando DOI para '{title[:50]}...': {e}")
        
        return None
    
    def search_doi_by_pmid(self, pmid: str) -> Optional[str]:
        """Busca DOI por PMID usando PubMed E-utilities"""
        try:
            url = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi"
            params = {
                'db': 'pubmed',
                'id': pmid,
                'retmode': 'xml',
                'email': 'felipe@wcai2alfa.com',
                'tool': 'DOIExtractor'
            }
            
            response = requests.get(url, params=params, headers=self.headers, timeout=10)
            if response.status_code == 200:
                # Buscar DOI en el XML
                doi_match = re.search(r'<ArticleId IdType="doi">([^<]+)</ArticleId>', response.text)
                if doi_match:
                    return doi_match.group(1)
            
            time.sleep(0.34)  # PubMed rate limiting
            
        except Exception as e:
            logger.debug(f"Error buscando DOI para PMID {pmid}: {e}")
        
        return None
    
    def validate_doi(self, doi: str) -> bool:
        """Valida que el DOI tenga formato correcto"""
        if not doi:
            return False
        
        # Patrón básico de DOI
        doi_pattern = r'^10\.\d{4,}/.+'
        return bool(re.match(doi_pattern, doi))
    
    def extract_missing_dois(self, csv_file: str, output_file: str):
        """Extrae DOIs faltantes y mejora el CSV"""
        
        # Cargar datos
        df = pd.read_csv(csv_file)
        logger.info(f"📚 Cargados {len(df)} papers del CSV")
        
        # Identificar papers sin DOI
        missing_doi_mask = df['doi'].isna()
        missing_doi_count = missing_doi_mask.sum()
        logger.info(f"🔍 Encontrados {missing_doi_count} papers sin DOI")
        
        if missing_doi_count == 0:
            logger.info("✅ Todos los papers ya tienen DOI")
            return
        
        # Contador de DOIs encontrados
        found_dois = 0
        
        # Procesar papers sin DOI
        for idx, row in df[missing_doi_mask].iterrows():
            logger.info(f"🔍 Procesando paper {idx+1}/{missing_doi_count}: {row['title'][:50]}...")
            
            doi = None
            
            # Método 1: Extraer de título
            if pd.notna(row['title']):
                doi = self.extract_doi_from_title(row['title'])
            
            # Método 2: Extraer de abstract
            if not doi and pd.notna(row['abstract']):
                doi = self.extract_doi_from_abstract(row['abstract'])
            
            # Método 3: Buscar por PMID
            if not doi and pd.notna(row['pmid']):
                doi = self.search_doi_by_pmid(str(row['pmid']))
            
            # Método 4: Buscar por título
            if not doi and pd.notna(row['title']):
                doi = self.search_doi_by_title(row['title'])
            
            # Validar y asignar DOI
            if doi and self.validate_doi(doi):
                df.at[idx, 'doi'] = doi
                found_dois += 1
                logger.info(f"✅ DOI encontrado: {doi}")
            else:
                logger.debug(f"❌ No se encontró DOI válido")
            
            # Pausa para evitar rate limiting
            time.sleep(0.5)
        
        # Guardar CSV mejorado
        df.to_csv(output_file, index=False, encoding='utf-8')
        
        # Estadísticas finales
        final_missing = df['doi'].isna().sum()
        final_percentage = (len(df) - final_missing) / len(df) * 100
        
        logger.info(f"🎉 EXTRACCIÓN COMPLETADA")
        logger.info(f"📊 DOIs encontrados: {found_dois}")
        logger.info(f"📊 Papers sin DOI restantes: {final_missing}")
        logger.info(f"📊 Porcentaje con DOI: {final_percentage:.1f}%")
        logger.info(f"💾 CSV mejorado guardado en: {output_file}")
        
        return df

def main():
    """Función principal"""
    
    extractor = DOIExtractor()
    
    # Archivos
    input_file = 'real_papers_analysis.csv'
    output_file = 'real_papers_analysis_with_dois.csv'
    
    print("🔍 INICIANDO EXTRACCIÓN DE DOIs FALTANTES")
    print("=" * 50)
    
    # Extraer DOIs faltantes
    df = extractor.extract_missing_dois(input_file, output_file)
    
    if df is not None:
        # Mostrar estadísticas finales
        print("\n📊 ESTADÍSTICAS FINALES:")
        print(f"📚 Total papers: {len(df)}")
        print(f"🔗 Papers con DOI: {df['doi'].notna().sum()}")
        print(f"❌ Papers sin DOI: {df['doi'].isna().sum()}")
        print(f"📈 Porcentaje con DOI: {df['doi'].notna().sum()/len(df)*100:.1f}%")
        
        # Mostrar algunos ejemplos de papers sin DOI
        missing_dois = df[df['doi'].isna()].head(5)
        if len(missing_dois) > 0:
            print(f"\n📋 EJEMPLOS DE PAPERS SIN DOI:")
            for idx, row in missing_dois.iterrows():
                print(f"  • {row['title'][:60]}...")

if __name__ == "__main__":
    main()
