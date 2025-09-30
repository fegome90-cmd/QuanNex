#!/usr/bin/env python3
"""
Búsqueda Bibliográfica Real - Motor RETE WCAI2-ALFA
Usa APIs reales para buscar 500+ papers científicos sobre wound care
"""

import requests
import time
import json
import xml.etree.ElementTree as ET
from dataclasses import dataclass, asdict
from typing import List, Dict, Optional
from urllib.parse import quote
import logging

# Configurar logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

@dataclass
class RealPaper:
    """Estructura para papers reales extraídos de APIs"""
    pmid: Optional[str] = None
    doi: Optional[str] = None
    title: str = ""
    authors: List[str] = None
    journal: str = ""
    year: Optional[int] = None
    abstract: str = ""
    citations: Optional[int] = None
    keywords: List[str] = None
    source_api: str = ""
    url: str = ""
    study_type: str = ""
    
    def __post_init__(self):
        if self.authors is None:
            self.authors = []
        if self.keywords is None:
            self.keywords = []

class RealBibliographicSearcher:
    """Buscador bibliográfico real usando múltiples APIs"""
    
    def __init__(self, email: str = "researcher@example.com"):
        self.email = email
        self.apis = {
            'pubmed': 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils/',
            'semantic_scholar': 'https://api.semanticscholar.org/graph/v1/',
            'openalex': 'https://api.openalex.org/',
            'crossref': 'https://api.crossref.org/'
        }
        self.headers = {
            'User-Agent': 'RealBibliographicSearcher/1.0 (mailto:' + email + ')'
        }
        
    def search_pubmed(self, query: str, max_results: int = 500) -> List[RealPaper]:
        """Búsqueda real en PubMed usando E-utilities API"""
        papers = []
        
        try:
            # Paso 1: Buscar IDs con esearch
            search_url = f"{self.apis['pubmed']}esearch.fcgi"
            params = {
                'db': 'pubmed',
                'term': query,
                'retmax': max_results,
                'retmode': 'xml',
                'email': self.email,
                'tool': 'RealBibliographicSearcher'
            }
            
            logger.info(f"🔍 Buscando en PubMed: {query}")
            response = requests.get(search_url, params=params, headers=self.headers)
            response.raise_for_status()
            
            # Parsear respuesta XML
            root = ET.fromstring(response.content)
            id_list = root.find('.//IdList')
            
            if id_list is None:
                logger.warning("No se encontraron resultados en PubMed")
                return papers
                
            pmids = [id_elem.text for id_elem in id_list.findall('Id')]
            logger.info(f"📊 Encontrados {len(pmids)} PMIDs en PubMed")
            
            # Paso 2: Obtener detalles con efetch (en lotes de 200)
            batch_size = 200
            for i in range(0, len(pmids), batch_size):
                batch_pmids = pmids[i:i + batch_size]
                id_string = ','.join(batch_pmids)
                
                fetch_url = f"{self.apis['pubmed']}efetch.fcgi"
                fetch_params = {
                    'db': 'pubmed',
                    'id': id_string,
                    'retmode': 'xml',
                    'email': self.email,
                    'tool': 'RealBibliographicSearcher'
                }
                
                logger.info(f"📥 Obteniendo detalles del lote {i//batch_size + 1}")
                fetch_response = requests.get(fetch_url, params=fetch_params, headers=self.headers)
                fetch_response.raise_for_status()
                
                # Parsear papers del lote
                batch_papers = self._parse_pubmed_xml(fetch_response.content)
                papers.extend(batch_papers)
                
                # Respetar límites de la API
                time.sleep(0.34)  # Max 3 requests per second
                
        except Exception as e:
            logger.error(f"❌ Error en búsqueda PubMed: {e}")
            
        return papers
    
    def _parse_pubmed_xml(self, xml_content: bytes) -> List[RealPaper]:
        """Parsea XML de PubMed y extrae información de papers"""
        papers = []
        
        try:
            root = ET.fromstring(xml_content)
            articles = root.findall('.//PubmedArticle')
            
            for article in articles:
                paper = RealPaper(source_api="PubMed")
                
                # PMID
                pmid_elem = article.find('.//PMID')
                if pmid_elem is not None:
                    paper.pmid = pmid_elem.text
                
                # Título
                title_elem = article.find('.//ArticleTitle')
                if title_elem is not None:
                    paper.title = title_elem.text or ""
                
                # Abstract
                abstract_elem = article.find('.//Abstract/AbstractText')
                if abstract_elem is not None:
                    paper.abstract = abstract_elem.text or ""
                
                # Journal
                journal_elem = article.find('.//Journal/Title')
                if journal_elem is not None:
                    paper.journal = journal_elem.text or ""
                
                # Año
                year_elem = article.find('.//PubDate/Year')
                if year_elem is not None:
                    try:
                        paper.year = int(year_elem.text)
                    except (ValueError, TypeError):
                        pass
                
                # Autores
                authors = []
                author_list = article.find('.//AuthorList')
                if author_list is not None:
                    for author in author_list.findall('Author'):
                        lastname = author.find('LastName')
                        forename = author.find('ForeName')
                        if lastname is not None:
                            name = lastname.text or ""
                            if forename is not None:
                                name = f"{forename.text} {name}"
                            authors.append(name)
                paper.authors = authors
                
                # DOI
                doi_elem = article.find('.//ArticleId[@IdType="doi"]')
                if doi_elem is not None:
                    paper.doi = doi_elem.text
                
                # URL
                if paper.pmid:
                    paper.url = f"https://pubmed.ncbi.nlm.nih.gov/{paper.pmid}/"
                
                # Keywords/MeSH terms
                keywords = []
                mesh_list = article.find('.//MeshHeadingList')
                if mesh_list is not None:
                    for mesh in mesh_list.findall('MeshHeading'):
                        descriptor = mesh.find('DescriptorName')
                        if descriptor is not None:
                            keywords.append(descriptor.text)
                paper.keywords = keywords
                
                if paper.title:  # Solo agregar si tiene título
                    papers.append(paper)
                    
        except Exception as e:
            logger.error(f"❌ Error parseando XML PubMed: {e}")
            
        return papers
    
    def search_semantic_scholar(self, query: str, max_results: int = 500) -> List[RealPaper]:
        """Búsqueda real en Semantic Scholar API"""
        papers = []
        
        try:
            url = f"{self.apis['semantic_scholar']}paper/search"
            params = {
                'query': query,
                'limit': min(max_results, 100),  # Max 100 per request
                'fields': 'paperId,title,authors,year,journal,abstract,citationCount,url,fieldsOfStudy'
            }
            
            logger.info(f"🔍 Buscando en Semantic Scholar: {query}")
            response = requests.get(url, params=params, headers=self.headers)
            response.raise_for_status()
            
            data = response.json()
            
            if 'data' in data:
                for item in data['data']:
                    paper = RealPaper(source_api="Semantic Scholar")
                    
                    paper.title = item.get('title', '')
                    paper.year = item.get('year')
                    paper.abstract = item.get('abstract', '')
                    paper.citations = item.get('citationCount', 0)
                    paper.url = item.get('url', '')
                    
                    # Journal
                    if 'journal' in item and item['journal']:
                        paper.journal = item['journal'].get('name', '')
                    
                    # Autores
                    if 'authors' in item:
                        paper.authors = [author.get('name', '') for author in item['authors']]
                    
                    # Keywords (fields of study)
                    if 'fieldsOfStudy' in item and item['fieldsOfStudy']:
                        paper.keywords = item['fieldsOfStudy']
                    
                    if paper.title:
                        papers.append(paper)
                        
                logger.info(f"📊 Encontrados {len(papers)} papers en Semantic Scholar")
            
            # Rate limiting
            time.sleep(1)
            
        except Exception as e:
            logger.error(f"❌ Error en búsqueda Semantic Scholar: {e}")
            
        return papers
    
    def search_openalex(self, query: str, max_results: int = 500) -> List[RealPaper]:
        """Búsqueda real en OpenAlex API"""
        papers = []
        
        try:
            url = f"{self.apis['openalex']}works"
            params = {
                'search': query,
                'per-page': min(max_results, 200),  # Max 200 per page
                'mailto': self.email
            }
            
            logger.info(f"🔍 Buscando en OpenAlex: {query}")
            response = requests.get(url, params=params, headers=self.headers)
            response.raise_for_status()
            
            data = response.json()
            
            if 'results' in data:
                for item in data['results']:
                    paper = RealPaper(source_api="OpenAlex")
                    
                    paper.title = item.get('title', '')
                    paper.year = item.get('publication_year')
                    paper.citations = item.get('cited_by_count', 0)
                    paper.doi = item.get('doi', '').replace('https://doi.org/', '') if item.get('doi') else None
                    
                    # Abstract (OpenAlex lo llama 'abstract_inverted_index')
                    abstract_info = item.get('abstract_inverted_index')
                    if abstract_info:
                        # Reconstruir abstract desde inverted index
                        words = [''] * 1000  # Buffer suficientemente grande
                        for word, positions in abstract_info.items():
                            for pos in positions:
                                if pos < len(words):
                                    words[pos] = word
                        paper.abstract = ' '.join([w for w in words if w]).strip()
                    
                    # Journal
                    if 'primary_location' in item and item['primary_location']:
                        source = item['primary_location'].get('source')
                        if source:
                            paper.journal = source.get('display_name', '')
                    
                    # Autores
                    if 'authorships' in item:
                        authors = []
                        for authorship in item['authorships']:
                            author = authorship.get('author')
                            if author:
                                authors.append(author.get('display_name', ''))
                        paper.authors = authors
                    
                    # URL
                    paper.url = item.get('id', '')
                    
                    # Keywords (concepts)
                    if 'concepts' in item:
                        paper.keywords = [concept.get('display_name', '') for concept in item['concepts'][:10]]
                    
                    if paper.title:
                        papers.append(paper)
                        
                logger.info(f"📊 Encontrados {len(papers)} papers en OpenAlex")
            
        except Exception as e:
            logger.error(f"❌ Error en búsqueda OpenAlex: {e}")
            
        return papers
    
    def search_all_sources(self, queries: List[str], target_per_query: int = 150) -> List[RealPaper]:
        """Búsqueda combinada en todas las fuentes"""
        all_papers = []
        
        for query in queries:
            logger.info(f"🎯 Procesando query: {query}")
            
            # Buscar en cada fuente
            pubmed_papers = self.search_pubmed(query, target_per_query)
            semantic_papers = self.search_semantic_scholar(query, target_per_query)
            openalex_papers = self.search_openalex(query, target_per_query)
            
            # Combinar resultados
            query_papers = pubmed_papers + semantic_papers + openalex_papers
            all_papers.extend(query_papers)
            
            logger.info(f"📊 Total para '{query}': {len(query_papers)} papers")
            
            # Pausa entre queries
            time.sleep(2)
        
        # Eliminar duplicados por DOI/título
        unique_papers = self._remove_duplicates(all_papers)
        
        logger.info(f"🎉 TOTAL FINAL: {len(unique_papers)} papers únicos")
        return unique_papers
    
    def _remove_duplicates(self, papers: List[RealPaper]) -> List[RealPaper]:
        """Elimina papers duplicados basado en DOI o título"""
        seen_dois = set()
        seen_titles = set()
        unique_papers = []
        
        for paper in papers:
            # Usar DOI como identificador principal
            if paper.doi and paper.doi in seen_dois:
                continue
            if paper.doi:
                seen_dois.add(paper.doi)
            
            # Si no hay DOI, usar título normalizado
            title_key = paper.title.lower().strip()[:100] if paper.title else ""
            if title_key and title_key in seen_titles:
                continue
            if title_key:
                seen_titles.add(title_key)
            
            unique_papers.append(paper)
        
        return unique_papers
    
    def save_results(self, papers: List[RealPaper], filename: str):
        """Guarda los resultados en formato JSON"""
        papers_data = [asdict(paper) for paper in papers]
        
        with open(filename, 'w', encoding='utf-8') as f:
            json.dump(papers_data, f, indent=2, ensure_ascii=False)
        
        logger.info(f"💾 Resultados guardados en {filename}")
    
    def generate_summary_report(self, papers: List[RealPaper]) -> Dict:
        """Genera reporte resumen de la búsqueda"""
        if not papers:
            return {"error": "No papers found"}
        
        # Métricas básicas
        total_papers = len(papers)
        sources = {}
        years = {}
        journals = {}
        
        for paper in papers:
            # Por fuente
            source = paper.source_api
            sources[source] = sources.get(source, 0) + 1
            
            # Por año
            if paper.year:
                years[paper.year] = years.get(paper.year, 0) + 1
            
            # Por journal
            if paper.journal:
                journals[paper.journal] = journals.get(paper.journal, 0) + 1
        
        # Top journals
        top_journals = sorted(journals.items(), key=lambda x: x[1], reverse=True)[:10]
        
        # Rango de años
        valid_years = [y for y in years.keys() if y and y > 1980]
        year_range = f"{min(valid_years)}-{max(valid_years)}" if valid_years else "N/A"
        
        return {
            "total_papers": total_papers,
            "sources_breakdown": sources,
            "year_range": year_range,
            "papers_by_year": dict(sorted(years.items(), reverse=True)[:10]),
            "top_journals": top_journals[:10],
            "papers_with_abstract": len([p for p in papers if p.abstract]),
            "papers_with_doi": len([p for p in papers if p.doi]),
            "avg_citations": sum(p.citations or 0 for p in papers) / total_papers if total_papers > 0 else 0
        }

def main():
    """Función principal para ejecutar la búsqueda"""
    
    # Configurar buscador
    searcher = RealBibliographicSearcher(email="felipe@wcai2alfa.com")
    
    # Queries específicas para Motor RETE
    queries = [
        # Wound Assessment Tools
        "wound assessment scale validation chronic wound healing",
        "PUSH scale TIME wound BWAT DESIGN-R assessment tool",
        
        # Hemorrhage Classification
        "wound hemorrhage bleeding severity classification clinical",
        "surgical bleeding assessment scale validation",
        
        # Infection Diagnosis
        "wound infection diagnosis biomarkers clinical signs",
        "surgical site infection SSI diagnosis criteria",
        
        # Product Effectiveness
        "silver dressing antimicrobial wound care effectiveness",
        "wound care products clinical trial systematic review"
    ]
    
    print("🚀 INICIANDO BÚSQUEDA BIBLIOGRÁFICA REAL")
    print(f"📋 Queries a procesar: {len(queries)}")
    print(f"🎯 Target: ~{len(queries) * 150} papers totales")
    print("=" * 60)
    
    # Ejecutar búsqueda
    start_time = time.time()
    all_papers = searcher.search_all_sources(queries, target_per_query=150)
    end_time = time.time()
    
    # Generar reporte
    summary = searcher.generate_summary_report(all_papers)
    
    # Guardar resultados
    output_file = "real_bibliographic_search_results.json"
    searcher.save_results(all_papers, output_file)
    
    # Guardar reporte resumen
    summary_file = "real_bibliographic_summary.json"
    with open(summary_file, 'w', encoding='utf-8') as f:
        json.dump(summary, f, indent=2, ensure_ascii=False)
    
    # Mostrar resultados finales
    print("\n" + "=" * 60)
    print("🎉 BÚSQUEDA COMPLETADA")
    print(f"⏱️ Tiempo total: {end_time - start_time:.1f} segundos")
    print(f"📊 Total papers encontrados: {summary['total_papers']}")
    print(f"🔍 Fuentes utilizadas: {list(summary['sources_breakdown'].keys())}")
    print(f"📅 Rango de años: {summary['year_range']}")
    print(f"📄 Papers con abstract: {summary['papers_with_abstract']}")
    print(f"🔗 Papers con DOI: {summary['papers_with_doi']}")
    print(f"📊 Citas promedio: {summary['avg_citations']:.1f}")
    print(f"💾 Resultados en: {output_file}")
    print(f"📋 Resumen en: {summary_file}")

if __name__ == "__main__":
    main()
