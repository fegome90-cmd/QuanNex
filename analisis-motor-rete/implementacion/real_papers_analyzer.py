#!/usr/bin/env python3
"""
Analizador de Papers Reales - Motor RETE WCAI2-ALFA
Analiza los 2,188 papers reales encontrados para extraer multiplicadores específicos
"""

import json
import csv
import re
from dataclasses import dataclass, asdict
from typing import List, Dict, Optional, Set
import pandas as pd
from collections import Counter
import logging

# Configurar logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

@dataclass
class PaperAnalysis:
    """Análisis detallado de un paper para multiplicadores"""
    pmid: Optional[str] = None
    doi: Optional[str] = None
    title: str = ""
    journal: str = ""
    year: Optional[int] = None
    abstract: str = ""
    source_api: str = ""
    
    # Análisis de contenido
    wound_assessment_mentions: int = 0
    hemorrhage_mentions: int = 0
    infection_mentions: int = 0
    antimicrobial_mentions: int = 0
    silver_mentions: int = 0
    validation_mentions: int = 0
    clinical_trial: bool = False
    systematic_review: bool = False
    meta_analysis: bool = False
    validation: bool = False
    observational: bool = False
    
    # Multiplicadores extraídos
    timerop_multiplier: Optional[float] = None
    hemorrhage_multiplier: Optional[float] = None
    infection_multiplier: Optional[float] = None
    product_multiplier: Optional[float] = None
    
    # Calidad de evidencia
    evidence_grade: str = "D"  # A, B, C, D
    confidence_level: str = "Low"
    sample_size: Optional[int] = None
    
    # Categorización
    primary_category: str = ""
    secondary_category: str = ""
    relevance_score: float = 0.0

class RealPapersAnalyzer:
    """Analizador de papers reales para extraer multiplicadores"""
    
    def __init__(self):
        # Términos de búsqueda para cada categoría
        self.search_terms = {
            'wound_assessment': [
                'wound assessment', 'wound evaluation', 'wound scoring',
                'TIME scale', 'PUSH scale', 'BWAT', 'DESIGN-R',
                'wound healing assessment', 'chronic wound assessment'
            ],
            'hemorrhage': [
                'hemorrhage', 'bleeding', 'blood loss', 'surgical bleeding',
                'hemorrhage classification', 'bleeding severity',
                'hemorrhage scale', 'bleeding assessment'
            ],
            'infection': [
                'infection', 'surgical site infection', 'SSI',
                'wound infection', 'biomarkers', 'clinical signs',
                'infection diagnosis', 'microbial'
            ],
            'antimicrobial': [
                'antimicrobial', 'silver dressing', 'silver',
                'antibacterial', 'antiseptic', 'wound care products',
                'dressing effectiveness', 'product effectiveness'
            ],
            'validation': [
                'validation', 'validation study', 'reliability',
                'sensitivity', 'specificity', 'ROC curve',
                'inter-observer', 'intra-observer'
            ]
        }
        
        # Términos para identificar tipos de estudio
        self.study_types = {
            'clinical_trial': ['clinical trial', 'randomized', 'RCT', 'controlled trial'],
            'systematic_review': ['systematic review', 'meta-analysis', 'cochrane'],
            'validation': ['validation study', 'validation', 'reliability study'],
            'observational': ['observational', 'cohort', 'case-control', 'cross-sectional']
        }
        
    def load_papers(self, filename: str) -> List[Dict]:
        """Carga los papers desde el archivo JSON"""
        try:
            with open(filename, 'r', encoding='utf-8') as f:
                papers = json.load(f)
            logger.info(f"📚 Cargados {len(papers)} papers desde {filename}")
            return papers
        except Exception as e:
            logger.error(f"❌ Error cargando papers: {e}")
            return []
    
    def analyze_paper_content(self, paper: Dict) -> PaperAnalysis:
        """Analiza el contenido de un paper individual"""
        analysis = PaperAnalysis()
        
        # Datos básicos
        analysis.pmid = paper.get('pmid')
        analysis.doi = paper.get('doi')
        analysis.title = paper.get('title', '')
        analysis.journal = paper.get('journal', '')
        analysis.year = paper.get('year')
        analysis.abstract = paper.get('abstract', '')
        analysis.source_api = paper.get('source_api', '')
        
        # Texto combinado para análisis
        text = f"{analysis.title} {analysis.abstract}".lower()
        
        # Contar menciones por categoría
        for category, terms in self.search_terms.items():
            count = 0
            for term in terms:
                count += len(re.findall(r'\b' + re.escape(term.lower()) + r'\b', text))
            setattr(analysis, f"{category}_mentions", count)
        
        # Identificar tipo de estudio
        for study_type, terms in self.study_types.items():
            setattr(analysis, study_type, False)  # Inicializar en False
            for term in terms:
                if term.lower() in text:
                    setattr(analysis, study_type, True)
                    break
        
        # Calcular score de relevancia
        analysis.relevance_score = self._calculate_relevance_score(analysis)
        
        # Categorizar paper
        analysis.primary_category, analysis.secondary_category = self._categorize_paper(analysis)
        
        # Determinar calidad de evidencia
        analysis.evidence_grade = self._determine_evidence_grade(analysis)
        analysis.confidence_level = self._determine_confidence_level(analysis)
        
        return analysis
    
    def _calculate_relevance_score(self, analysis: PaperAnalysis) -> float:
        """Calcula score de relevancia para el motor RETE"""
        score = 0.0
        
        # Peso por menciones
        score += analysis.wound_assessment_mentions * 2.0
        score += analysis.hemorrhage_mentions * 1.5
        score += analysis.infection_mentions * 1.5
        score += analysis.antimicrobial_mentions * 1.0
        score += analysis.validation_mentions * 3.0
        
        # Bonus por tipo de estudio
        if analysis.systematic_review:
            score += 5.0
        if analysis.meta_analysis:
            score += 5.0
        if analysis.clinical_trial:
            score += 3.0
        if analysis.validation:
            score += 4.0
        
        # Bonus por año reciente
        if analysis.year and analysis.year >= 2020:
            score += 2.0
        elif analysis.year and analysis.year >= 2015:
            score += 1.0
        
        # Bonus por journal de alto impacto
        high_impact_journals = [
            'lancet', 'new england', 'jama', 'bmj', 'cochrane',
            'international wound journal', 'journal of wound care'
        ]
        if any(journal in analysis.journal.lower() for journal in high_impact_journals):
            score += 2.0
        
        return score
    
    def _categorize_paper(self, analysis: PaperAnalysis) -> tuple:
        """Categoriza el paper en categorías primaria y secundaria"""
        scores = {
            'wound_assessment': analysis.wound_assessment_mentions * 2,
            'hemorrhage': analysis.hemorrhage_mentions * 1.5,
            'infection': analysis.infection_mentions * 1.5,
            'antimicrobial': analysis.antimicrobial_mentions * 1
        }
        
        # Encontrar categorías con mayor score
        sorted_categories = sorted(scores.items(), key=lambda x: x[1], reverse=True)
        
        primary = sorted_categories[0][0] if sorted_categories[0][1] > 0 else 'general'
        secondary = sorted_categories[1][0] if len(sorted_categories) > 1 and sorted_categories[1][1] > 0 else 'none'
        
        return primary, secondary
    
    def _determine_evidence_grade(self, analysis: PaperAnalysis) -> str:
        """Determina el grado de evidencia GRADE"""
        if analysis.systematic_review or analysis.meta_analysis:
            return "A"
        elif analysis.clinical_trial:
            return "B"
        elif analysis.validation:
            return "B"
        elif analysis.observational:
            return "C"
        else:
            return "D"
    
    def _determine_confidence_level(self, analysis: PaperAnalysis) -> str:
        """Determina el nivel de confianza"""
        if analysis.evidence_grade == "A":
            return "High"
        elif analysis.evidence_grade == "B":
            return "Moderate"
        elif analysis.evidence_grade == "C":
            return "Low"
        else:
            return "Very Low"
    
    def analyze_all_papers(self, papers: List[Dict]) -> List[PaperAnalysis]:
        """Analiza todos los papers"""
        analyses = []
        
        logger.info(f"🔍 Analizando {len(papers)} papers...")
        
        for i, paper in enumerate(papers):
            if i % 100 == 0:
                logger.info(f"📊 Procesados {i}/{len(papers)} papers...")
            
            analysis = self.analyze_paper_content(paper)
            analyses.append(analysis)
        
        logger.info(f"✅ Análisis completado para {len(analyses)} papers")
        return analyses
    
    def generate_statistics(self, analyses: List[PaperAnalysis]) -> Dict:
        """Genera estadísticas del análisis"""
        stats = {
            'total_papers': len(analyses),
            'papers_by_category': Counter(),
            'papers_by_evidence_grade': Counter(),
            'papers_by_year': Counter(),
            'papers_by_journal': Counter(),
            'high_relevance_papers': 0,
            'validation_studies': 0,
            'clinical_trials': 0,
            'systematic_reviews': 0
        }
        
        for analysis in analyses:
            # Categorías
            stats['papers_by_category'][analysis.primary_category] += 1
            
            # Grado de evidencia
            stats['papers_by_evidence_grade'][analysis.evidence_grade] += 1
            
            # Año
            if analysis.year:
                stats['papers_by_year'][analysis.year] += 1
            
            # Journal
            if analysis.journal:
                stats['papers_by_journal'][analysis.journal] += 1
            
            # Papers de alta relevancia
            if analysis.relevance_score >= 10.0:
                stats['high_relevance_papers'] += 1
            
            # Tipos de estudio
            if analysis.validation:
                stats['validation_studies'] += 1
            if analysis.clinical_trial:
                stats['clinical_trials'] += 1
            if analysis.systematic_review:
                stats['systematic_reviews'] += 1
        
        return stats
    
    def save_to_csv(self, analyses: List[PaperAnalysis], filename: str):
        """Guarda los análisis en formato CSV"""
        if not analyses:
            logger.warning("No hay análisis para guardar")
            return
        
        # Convertir a diccionarios
        data = []
        for analysis in analyses:
            row = asdict(analysis)
            data.append(row)
        
        # Crear DataFrame y guardar
        df = pd.DataFrame(data)
        df.to_csv(filename, index=False, encoding='utf-8')
        
        logger.info(f"💾 Análisis guardado en {filename}")
        logger.info(f"📊 {len(data)} filas exportadas")
    
    def get_top_papers_by_category(self, analyses: List[PaperAnalysis], category: str, top_n: int = 20) -> List[PaperAnalysis]:
        """Obtiene los papers más relevantes por categoría"""
        category_papers = [a for a in analyses if a.primary_category == category]
        sorted_papers = sorted(category_papers, key=lambda x: x.relevance_score, reverse=True)
        return sorted_papers[:top_n]

def main():
    """Función principal"""
    
    analyzer = RealPapersAnalyzer()
    
    # Cargar papers
    papers = analyzer.load_papers('real_bibliographic_search_results.json')
    if not papers:
        logger.error("No se pudieron cargar los papers")
        return
    
    # Analizar papers
    analyses = analyzer.analyze_all_papers(papers)
    
    # Generar estadísticas
    stats = analyzer.generate_statistics(analyses)
    
    # Guardar análisis completo en CSV
    analyzer.save_to_csv(analyses, 'real_papers_analysis.csv')
    
    # Mostrar estadísticas
    print("\n" + "=" * 60)
    print("📊 ESTADÍSTICAS DEL ANÁLISIS DE PAPERS REALES")
    print("=" * 60)
    print(f"📚 Total papers analizados: {stats['total_papers']}")
    print(f"🎯 Papers de alta relevancia: {stats['high_relevance_papers']}")
    print(f"🔬 Estudios de validación: {stats['validation_studies']}")
    print(f"🏥 Ensayos clínicos: {stats['clinical_trials']}")
    print(f"📋 Revisiones sistemáticas: {stats['systematic_reviews']}")
    
    print("\n📊 DISTRIBUCIÓN POR CATEGORÍAS:")
    for category, count in stats['papers_by_category'].most_common():
        print(f"  • {category}: {count} papers")
    
    print("\n📊 DISTRIBUCIÓN POR GRADO DE EVIDENCIA:")
    for grade, count in stats['papers_by_evidence_grade'].most_common():
        print(f"  • Grado {grade}: {count} papers")
    
    print("\n📊 TOP JOURNALS:")
    for journal, count in stats['papers_by_journal'].most_common(10):
        print(f"  • {journal}: {count} papers")
    
    # Mostrar papers más relevantes por categoría
    print("\n🏆 PAPERS MÁS RELEVANTES POR CATEGORÍA:")
    
    categories = ['wound_assessment', 'hemorrhage', 'infection', 'antimicrobial']
    for category in categories:
        top_papers = analyzer.get_top_papers_by_category(analyses, category, 5)
        if top_papers:
            print(f"\n📐 {category.upper()}:")
            for i, paper in enumerate(top_papers, 1):
                print(f"  {i}. {paper.title[:80]}... (Score: {paper.relevance_score:.1f})")
    
    print(f"\n💾 Análisis completo guardado en: real_papers_analysis.csv")

if __name__ == "__main__":
    main()
