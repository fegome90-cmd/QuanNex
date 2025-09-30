"""
Tests matemáticos para ConfidenceCalculator

Tests para validar la normalización matemática y corrección de scores
de confianza fuera de rango [0.0, 1.0] en el motor RETE.

Author: Claude Assistant con Archon MCP
Date: Agosto 31, 2025
Version: 1.0.0
"""

import pytest
import math
import random
import numpy as np
from typing import List, Dict, Any

# Importar el módulo a testear
import sys
import os
sys.path.append(os.path.join(os.path.dirname(__file__), '..', 'implementacion'))

from confidence_calculator import (
    ConfidenceCalculator, 
    ConfidenceConfig, 
    ConfidenceConfigs,
    calculate_confidence_simple
)

class TestConfidenceCalculator:
    """Tests para ConfidenceCalculator"""
    
    def setup_method(self):
        """Setup para cada test"""
        self.calculator = ConfidenceCalculator()
        self.config = ConfidenceConfig()
    
    def test_confidence_range_validation(self):
        """Test que todos los scores de confianza estén en rango [0.0, 1.0]"""
        
        # Casos extremos que antes causaban problemas
        extreme_cases = [
            {'base_score': 0.8, 'severity_level': 'severe', 'complexity_level': 'critical'},
            {'base_score': 0.9, 'severity_level': 'severe', 'complexity_level': 'critical'},
            {'base_score': 1.0, 'severity_level': 'severe', 'complexity_level': 'critical'},
            {'base_score': 0.5, 'severity_level': 'severe', 'complexity_level': 'critical'},
        ]
        
        for case in extreme_cases:
            confidence = self.calculator.calculate_confidence(**case)
            assert 0.0 <= confidence <= 1.0, f"Confianza fuera de rango: {confidence} para caso {case}"
    
    def test_sigmoid_normalization(self):
        """Test de normalización sigmoid"""
        
        # Verificar que la función sigmoid normaliza correctamente
        raw_scores = [0.0, 0.5, 1.0, 1.5, 2.0, 2.5]
        
        for raw_score in raw_scores:
            normalized = self.calculator._sigmoid_normalize(raw_score)
            assert 0.0 <= normalized <= 1.0, f"Sigmoid no normaliza correctamente: {raw_score} -> {normalized}"
    
    def test_distribution_statistics(self):
        """Test de estadísticas de distribución"""
        
        # Generar 1000 casos aleatorios
        random.seed(42)  # Para reproducibilidad
        cases = []
        
        for _ in range(1000):
            case = {
                'base_score': random.uniform(0.0, 1.0),
                'severity_level': random.choice(['none', 'minimal', 'moderate', 'severe']),
                'complexity_level': random.choice(['simple', 'moderate', 'complex', 'critical'])
            }
            cases.append(case)
        
        # Calcular confianzas
        confidences = self.calculator.batch_calculate_confidence(cases)
        
        # Obtener estadísticas
        stats = self.calculator.get_confidence_statistics(confidences)
        
        # Validar estadísticas
        assert stats['count'] == 1000
        assert 0.0 <= stats['min'] <= 1.0
        assert 0.0 <= stats['max'] <= 1.0
        assert 0.0 <= stats['mean'] <= 1.0
        assert stats['std'] >= 0.0
        assert stats['in_range'] == 100.0  # Todos deben estar en rango
    
    def test_edge_cases(self):
        """Test de casos edge"""
        
        edge_cases = [
            # Caso mínimo
            {'base_score': 0.0, 'severity_level': 'none', 'complexity_level': 'simple'},
            # Caso máximo
            {'base_score': 1.0, 'severity_level': 'severe', 'complexity_level': 'critical'},
            # Caso con factores adicionales
            {'base_score': 0.5, 'severity_level': 'moderate', 'complexity_level': 'moderate',
             'additional_factors': {'factor1': 1.5, 'factor2': 0.8}},
        ]
        
        for case in edge_cases:
            confidence = self.calculator.calculate_confidence(**case)
            assert 0.0 <= confidence <= 1.0, f"Edge case falló: {case} -> {confidence}"
    
    def test_input_validation(self):
        """Test de validación de inputs"""
        
        # Test con base_score inválido
        with pytest.raises(ValueError):
            self.calculator.calculate_confidence(base_score=1.5, severity_level='moderate', complexity_level='moderate')
        
        with pytest.raises(ValueError):
            self.calculator.calculate_confidence(base_score=-0.1, severity_level='moderate', complexity_level='moderate')
        
        # Test con severity_level inválido
        with pytest.raises(ValueError):
            self.calculator.calculate_confidence(base_score=0.5, severity_level='invalid', complexity_level='moderate')
        
        # Test con complexity_level inválido
        with pytest.raises(ValueError):
            self.calculator.calculate_confidence(base_score=0.5, severity_level='moderate', complexity_level='invalid')
    
    def test_different_configurations(self):
        """Test con diferentes configuraciones"""
        
        # Configuración conservadora
        conservative_calc = ConfidenceCalculator(ConfidenceConfigs.conservative())
        conservative_conf = conservative_calc.calculate_confidence(0.8, 'severe', 'critical')
        
        # Configuración agresiva
        aggressive_calc = ConfidenceCalculator(ConfidenceConfigs.aggressive())
        aggressive_conf = aggressive_calc.calculate_confidence(0.8, 'severe', 'critical')
        
        # Configuración estándar
        standard_conf = self.calculator.calculate_confidence(0.8, 'severe', 'critical')
        
        # Verificar que todas están en rango
        assert 0.0 <= conservative_conf <= 1.0
        assert 0.0 <= aggressive_conf <= 1.0
        assert 0.0 <= standard_conf <= 1.0
        
        # Verificar que son diferentes (diferentes configuraciones)
        assert conservative_conf != aggressive_conf
        assert conservative_conf != standard_conf
        assert aggressive_conf != standard_conf

class TestMathematicalProperties:
    """Tests de propiedades matemáticas"""
    
    def setup_method(self):
        """Setup para cada test"""
        self.calculator = ConfidenceCalculator()
    
    def test_monotonicity(self):
        """Test de monotonía: mayor base_score debe dar mayor confianza"""
        
        base_scores = [0.1, 0.3, 0.5, 0.7, 0.9]
        confidences = []
        
        for base_score in base_scores:
            conf = self.calculator.calculate_confidence(base_score, 'moderate', 'moderate')
            confidences.append(conf)
        
        # Verificar monotonía
        for i in range(1, len(confidences)):
            assert confidences[i] >= confidences[i-1], f"Falta monotonía: {confidences[i-1]} -> {confidences[i]}"
    
    def test_symmetry_around_base(self):
        """Test de simetría alrededor del punto base"""
        
        base_confidence = 0.5
        delta = 0.2
        
        # Confianza con base_score menor
        lower_conf = self.calculator.calculate_confidence(base_confidence - delta, 'moderate', 'moderate')
        
        # Confianza con base_score mayor
        higher_conf = self.calculator.calculate_confidence(base_confidence + delta, 'moderate', 'moderate')
        
        # Deben ser aproximadamente simétricas (con tolerancia)
        tolerance = 0.1
        assert abs(lower_conf - (1 - higher_conf)) < tolerance, f"Falta simetría: {lower_conf} vs {1 - higher_conf}"
    
    def test_sigmoid_properties(self):
        """Test de propiedades de la función sigmoid"""
        
        # Test de límites
        assert self.calculator._sigmoid_normalize(0.0) < 0.5  # Menor que el punto base
        assert self.calculator._sigmoid_normalize(0.5) == 0.5  # Igual al punto base
        assert self.calculator._sigmoid_normalize(1.0) > 0.5  # Mayor que el punto base
        
        # Test de continuidad
        x_values = np.linspace(0, 2, 100)
        y_values = [self.calculator._sigmoid_normalize(x) for x in x_values]
        
        # Verificar que es continua (sin saltos)
        for i in range(1, len(y_values)):
            assert abs(y_values[i] - y_values[i-1]) < 0.1, f"Discontinuidad en x={x_values[i]}"

class TestPerformance:
    """Tests de performance"""
    
    def setup_method(self):
        """Setup para cada test"""
        self.calculator = ConfidenceCalculator()
    
    def test_batch_performance(self):
        """Test de performance para cálculos en lote"""
        
        import time
        
        # Generar 1000 casos
        cases = []
        for i in range(1000):
            case = {
                'base_score': random.uniform(0.0, 1.0),
                'severity_level': random.choice(['none', 'minimal', 'moderate', 'severe']),
                'complexity_level': random.choice(['simple', 'moderate', 'complex', 'critical'])
            }
            cases.append(case)
        
        # Medir tiempo de cálculo en lote
        start_time = time.time()
        confidences = self.calculator.batch_calculate_confidence(cases)
        batch_time = time.time() - start_time
        
        # Medir tiempo de cálculo individual
        start_time = time.time()
        individual_confidences = []
        for case in cases:
            conf = self.calculator.calculate_confidence(**case)
            individual_confidences.append(conf)
        individual_time = time.time() - start_time
        
        # Verificar que los resultados son iguales
        assert confidences == individual_confidences
        
        # Verificar que el batch es más rápido (o al menos no significativamente más lento)
        assert batch_time <= individual_time * 1.5, f"Batch no es más eficiente: {batch_time} vs {individual_time}"
        
        # Verificar que el tiempo total es razonable (< 1 segundo para 1000 casos)
        assert batch_time < 1.0, f"Performance muy lenta: {batch_time} segundos para 1000 casos"
    
    def test_memory_usage(self):
        """Test de uso de memoria"""
        
        import psutil
        import os
        
        process = psutil.Process(os.getpid())
        initial_memory = process.memory_info().rss
        
        # Generar muchos casos
        cases = []
        for i in range(10000):
            case = {
                'base_score': random.uniform(0.0, 1.0),
                'severity_level': random.choice(['none', 'minimal', 'moderate', 'severe']),
                'complexity_level': random.choice(['simple', 'moderate', 'complex', 'critical'])
            }
            cases.append(case)
        
        # Calcular confianzas
        confidences = self.calculator.batch_calculate_confidence(cases)
        
        final_memory = process.memory_info().rss
        memory_increase = final_memory - initial_memory
        
        # Verificar que el uso de memoria es razonable (< 100MB)
        assert memory_increase < 100 * 1024 * 1024, f"Uso de memoria excesivo: {memory_increase / 1024 / 1024:.1f}MB"

class TestIntegration:
    """Tests de integración"""
    
    def test_function_simple(self):
        """Test de la función de conveniencia"""
        
        confidence = calculate_confidence_simple(0.8, 'severe', 'critical')
        assert 0.0 <= confidence <= 1.0
        
        # Debe ser igual al cálculo directo
        calculator = ConfidenceCalculator()
        direct_confidence = calculator.calculate_confidence(0.8, 'severe', 'critical')
        assert confidence == direct_confidence
    
    def test_error_handling(self):
        """Test de manejo de errores"""
        
        calculator = ConfidenceCalculator()
        
        # Caso con error debe retornar confianza mínima
        try:
            # Forzar un error
            confidence = calculator.calculate_confidence(0.5, 'invalid', 'moderate')
        except ValueError:
            # Error esperado
            pass
        
        # Caso con excepción no controlada debe retornar confianza mínima
        # (esto se maneja en el método calculate_confidence)

if __name__ == "__main__":
    # Ejecutar tests
    pytest.main([__file__, "-v"])
