# 🔍 **HERRAMIENTAS REALES PARA BÚSQUEDAS BIBLIOGRÁFICAS**

## 📚 **APIs Y HERRAMIENTAS DE CÓDIGO ABIERTO (GitHub)**

### **1. PubMed E-utilities API**
- **Repositorio**: `https://github.com/ncbi/entrez-direct`
- **API**: `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/`
- **Descripción**: API oficial de NCBI para acceder a PubMed
- **Uso**: Búsquedas programáticas en 35+ millones de papers
- **Ejemplo de búsqueda**:
  ```bash
  curl "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?db=pubmed&term=wound+healing&retmax=100"
  ```

### **2. Semantic Scholar API**
- **API**: `https://api.semanticscholar.org/`
- **GitHub**: `https://github.com/danielnsilva/semanticscholar`
- **Descripción**: API gratuita con 200M+ papers científicos
- **Límites**: 100 requests/5min (gratis), 1000/5min (con API key)
- **Ventajas**: Incluye citas, influencia, campos semánticos

### **3. ArXiv API**
- **API**: `http://export.arxiv.org/api/query`
- **GitHub**: `https://github.com/lukasschwab/arxiv.py`
- **Descripción**: Acceso a preprints de física, matemáticas, CS, etc.
- **Uso**: Búsquedas en tiempo real sin límites

### **4. CrossRef API**
- **API**: `https://api.crossref.org/`
- **GitHub**: `https://github.com/CrossRef/rest-api-doc`
- **Descripción**: Metadatos de 134M+ trabajos académicos
- **Límites**: Sin límites para uso académico

## 🛠️ **BIBLIOTECAS PYTHON ESPECIALIZADAS**

### **1. Bio.Entrez (Biopython)**
```python
from Bio import Entrez
Entrez.email = "your_email@example.com"
handle = Entrez.esearch(db="pubmed", term="wound healing", retmax=500)
record = Entrez.read(handle)
```

### **2. PyMed**
```python
from pymed import PubMed
pubmed = PubMed(tool="MyTool", email="my_email@example.com")
results = pubmed.query("wound healing", max_results=500)
```

### **3. Scholarly (Google Scholar)**
```python
from scholarly import scholarly
search_query = scholarly.search_pubs('wound assessment tools')
```

## 🌐 **SERVICIOS WEB ESPECIALIZADOS**

### **1. OpenAlex**
- **API**: `https://openalex.org/`
- **Descripción**: 250M+ trabajos académicos, gratis
- **Ventaja**: Reemplazo de Microsoft Academic Graph

### **2. CORE API**
- **API**: `https://core.ac.uk/services/api`
- **Descripción**: 207M+ papers de repositorios académicos
- **Límites**: 1000 requests/día (gratis)

### **3. Europe PMC API**
- **API**: `https://europepmc.org/RestfulWebService`
- **Descripción**: Literatura biomédica europea
- **Ventaja**: Acceso a texto completo

## 🎯 **HERRAMIENTAS ESPECÍFICAS PARA MEDICINA**

### **1. ClinicalTrials.gov API**
- **API**: `https://clinicaltrials.gov/api/`
- **Descripción**: Ensayos clínicos registrados
- **Uso**: Búsqueda de estudios por condición médica

### **2. Cochrane Library API**
- **Descripción**: Revisiones sistemáticas y meta-análisis
- **Acceso**: Mediante Wiley Online Library API

### **3. WHO Global Health Observatory**
- **API**: `https://ghoapi.azureedge.net/`
- **Descripción**: Datos de salud global

## 💾 **BASES DE DATOS ESPECIALIZADAS**

### **1. EMBASE (Elsevier)**
- **API**: Scopus API `https://dev.elsevier.com/`
- **Descripción**: Literatura biomédica y farmacológica
- **Costo**: Requiere suscripción

### **2. Web of Science API**
- **API**: Clarivate Web of Science
- **Descripción**: Análisis de citas y métricas
- **Costo**: Requiere suscripción

## 🔧 **HERRAMIENTAS DE EXTRACCIÓN Y ANÁLISIS**

### **1. Zotero API**
- **API**: `https://www.zotero.org/support/dev/web_api/v3/start`
- **Uso**: Gestión y organización de referencias

### **2. Mendeley API**
- **API**: `https://dev.mendeley.com/`
- **Uso**: Red social académica y gestión de papers

### **3. Papers with Code API**
- **GitHub**: `https://github.com/paperswithcode/paperswithcode-client`
- **Descripción**: Papers de ML/AI con código asociado

## 📊 **SCRIPT DE BÚSQUEDA MASIVA PROPUESTO**

### **Configuración Multi-API**
```python
import requests
import time
from dataclasses import dataclass
from typing import List, Dict

@dataclass
class RealPaper:
    pmid: str
    title: str
    authors: List[str]
    journal: str
    year: int
    doi: str
    abstract: str
    citations: int
    keywords: List[str]

class RealBibliographicSearcher:
    def __init__(self):
        self.apis = {
            'pubmed': 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils/',
            'semantic_scholar': 'https://api.semanticscholar.org/graph/v1/',
            'crossref': 'https://api.crossref.org/',
            'openalex': 'https://api.openalex.org/'
        }
    
    def search_pubmed(self, query: str, max_results: int = 500) -> List[RealPaper]:
        # Implementación real con E-utilities
        pass
    
    def search_semantic_scholar(self, query: str, max_results: int = 500) -> List[RealPaper]:
        # Implementación real con Semantic Scholar API
        pass
    
    def search_all_sources(self, query: str, total_target: int = 500) -> List[RealPaper]:
        # Búsqueda combinada en todas las fuentes
        pass
```

## 🎯 **BÚSQUEDAS ESPECÍFICAS PARA MOTOR RETE**

### **Términos de búsqueda recomendados:**
1. **Wound Assessment**: `("wound assessment" OR "wound evaluation") AND (scale OR tool OR score)`
2. **Hemorrhage Classification**: `("hemorrhage classification" OR "bleeding severity") AND (clinical OR assessment)`
3. **Infection Diagnosis**: `("wound infection" OR "surgical site infection") AND (diagnosis OR biomarkers)`
4. **Product Effectiveness**: `("silver dressing" OR "antimicrobial" OR "wound care products") AND effectiveness`

### **Filtros recomendados:**
- **Fecha**: Últimos 10 años (2014-2024)
- **Tipo de estudio**: Clinical trials, systematic reviews, meta-analysis
- **Idioma**: Inglés, español
- **Población**: Humanos

## 🚀 **IMPLEMENTACIÓN INMEDIATA**

¿Cuál de estas herramientas prefieres que implemente primero para comenzar la búsqueda real de 500+ papers?

1. **PubMed E-utilities** (más completo para medicina)
2. **Semantic Scholar** (más rápido, sin límites estrictos)
3. **OpenAlex** (más amplio, incluye todas las disciplinas)
4. **Combinación multi-API** (más robusto pero complejo)
