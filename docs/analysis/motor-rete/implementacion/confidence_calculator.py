"""
ConfidenceCalculator - Calculadora de confianza con normalización matemática

Implementación de la solución para el problema de scores de confianza
fuera de rango [0.0, 1.0] en el motor RETE de WCAI2-ALFA.

Author: Claude Assistant con Archon MCP
Date: Agosto 31, 2025
Version: 1.0.0
"""

import math
import logging
from typing import Optional, Tuple, Dict, Any
from dataclasses import dataclass

logger = logging.getLogger(__name__)

@dataclass
class ConfidenceConfig:
    """Configuración para el cálculo de confianza"""
    min_confidence: float = 0.0
    max_confidence: float = 1.0
    base_confidence: float = 0.5
    sigmoid_steepness: float = 4.0
    severity_multipliers: Dict[str, float] = None
    complexity_factors: Dict[str, float] = None
    
    def __post_init__(self):
        if self.severity_multipliers is None:
            self.severity_multipliers = {
                'none': 1.0,
                'minimal': 1.1,
                'moderate': 1.3,
                'severe': 1.5
            }
        
        if self.complexity_factors is None:
            self.complexity_factors = {
                'simple': 1.0,
                'moderate': 1.2,
                'complex': 1.4,
                'critical': 1.6
            }

class ConfidenceCalculator:
    """
    Calculadora de confianza con normalización matemática
    
    Resuelve el problema de scores de confianza fuera de rango [0.0, 1.0]
    usando normalización con función sigmoid y límites estrictos.
    """
    
    def __init__(self, config: Optional[ConfidenceConfig] = None):
        """
        Inicializa la calculadora de confianza
        
        Args:
            config: Configuración personalizada para el cálculo
        """
        self.config = config or ConfidenceConfig()
        logger.info(f"ConfidenceCalculator inicializado con config: {self.config}")
    
    def calculate_confidence(self, 
                           base_score: float,
                           severity_level: str = 'moderate',
                           complexity_level: str = 'moderate',
                           additional_factors: Optional[Dict[str, float]] = None) -> float:
        """
        Calcula confianza normalizada usando función sigmoid
        
        Args:
            base_score: Score base de confianza (0.0-1.0)
            severity_level: Nivel de severidad ('none', 'minimal', 'moderate', 'severe')
            complexity_level: Nivel de complejidad ('simple', 'moderate', 'complex', 'critical')
            additional_factors: Factores adicionales que afectan la confianza
            
        Returns:
            float: Score de confianza normalizado en rango [0.0, 1.0]
        """
        try:
            # Validar inputs
            self._validate_inputs(base_score, severity_level, complexity_level)
            
            # Obtener multiplicadores
            severity_multiplier = self.config.severity_multipliers.get(severity_level, 1.0)
            complexity_factor = self.config.complexity_factors.get(complexity_level, 1.0)
            
            # Cálculo raw
            raw_score = base_score * severity_multiplier * complexity_factor
            
            # Aplicar factores adicionales si existen
            if additional_factors:
                for factor_name, factor_value in additional_factors.items():
                    raw_score *= factor_value
                    logger.debug(f"Aplicando factor adicional {factor_name}: {factor_value}")
            
            # Normalización usando sigmoid
            normalized_score = self._sigmoid_normalize(raw_score)
            
            # Aplicar límites estrictos
            final_confidence = max(self.config.min_confidence, 
                                 min(self.config.max_confidence, normalized_score))
            
            logger.debug(f"Confianza calculada: base={base_score}, "
                        f"severity={severity_level}({severity_multiplier}), "
                        f"complexity={complexity_level}({complexity_factor}), "
                        f"raw={raw_score:.3f}, normalized={normalized_score:.3f}, "
                        f"final={final_confidence:.3f}")
            
            return final_confidence
            
        except Exception as e:
            logger.error(f"Error calculando confianza: {e}")
            # Retornar confianza mínima en caso de error
            return self.config.min_confidence
    
    def _sigmoid_normalize(self, raw_score: float) -> float:
        """
        Normaliza score usando función sigmoid
        
        Args:
            raw_score: Score raw sin normalizar
            
        Returns:
            float: Score normalizado usando sigmoid
        """
        # Función sigmoid: 1 / (1 + e^(-k(x - x0)))
        # k = steepness, x0 = base_confidence
        exponent = -self.config.sigmoid_steepness * (raw_score - self.config.base_confidence)
        normalized = 1 / (1 + math.exp(exponent))
        
        return normalized
    
    def _validate_inputs(self, base_score: float, severity_level: str, complexity_level: str):
        """
        Valida los inputs del cálculo de confianza
        
        Args:
            base_score: Score base a validar
            severity_level: Nivel de severidad a validar
            complexity_level: Nivel de complejidad a validar
            
        Raises:
            ValueError: Si algún input es inválido
        """
        # Validar base_score
        if not isinstance(base_score, (int, float)):
            raise ValueError(f"base_score debe ser numérico, recibido: {type(base_score)}")
        
        if base_score < 0 or base_score > 1:
            raise ValueError(f"base_score debe estar en rango [0.0, 1.0], recibido: {base_score}")
        
        # Validar severity_level
        if severity_level not in self.config.severity_multipliers:
            valid_levels = list(self.config.severity_multipliers.keys())
            raise ValueError(f"severity_level debe ser uno de {valid_levels}, recibido: {severity_level}")
        
        # Validar complexity_level
        if complexity_level not in self.config.complexity_factors:
            valid_levels = list(self.config.complexity_factors.keys())
            raise ValueError(f"complexity_level debe ser uno de {valid_levels}, recibido: {complexity_level}")
    
    def batch_calculate_confidence(self, 
                                 cases: list[Dict[str, Any]]) -> list[float]:
        """
        Calcula confianza para múltiples casos
        
        Args:
            cases: Lista de diccionarios con parámetros de cada caso
            
        Returns:
            list[float]: Lista de scores de confianza calculados
        """
        results = []
        
        for i, case in enumerate(cases):
            try:
                confidence = self.calculate_confidence(
                    base_score=case.get('base_score', 0.5),
                    severity_level=case.get('severity_level', 'moderate'),
                    complexity_level=case.get('complexity_level', 'moderate'),
                    additional_factors=case.get('additional_factors')
                )
                results.append(confidence)
                
            except Exception as e:
                logger.error(f"Error en caso {i}: {e}")
                results.append(self.config.min_confidence)
        
        return results
    
    def get_confidence_statistics(self, confidence_scores: list[float]) -> Dict[str, float]:
        """
        Calcula estadísticas de una lista de scores de confianza
        
        Args:
            confidence_scores: Lista de scores de confianza
            
        Returns:
            Dict[str, float]: Estadísticas calculadas
        """
        if not confidence_scores:
            return {
                'count': 0,
                'min': 0.0,
                'max': 0.0,
                'mean': 0.0,
                'std': 0.0,
                'in_range': 0.0
            }
        
        scores = [float(score) for score in confidence_scores]
        
        # Estadísticas básicas
        count = len(scores)
        min_score = min(scores)
        max_score = max(scores)
        mean_score = sum(scores) / count
        
        # Desviación estándar
        variance = sum((score - mean_score) ** 2 for score in scores) / count
        std_score = math.sqrt(variance)
        
        # Porcentaje en rango válido
        in_range_count = sum(1 for score in scores 
                           if self.config.min_confidence <= score <= self.config.max_confidence)
        in_range_percentage = (in_range_count / count) * 100
        
        return {
            'count': count,
            'min': min_score,
            'max': max_score,
            'mean': mean_score,
            'std': std_score,
            'in_range': in_range_percentage
        }

# Configuraciones predefinidas
class ConfidenceConfigs:
    """Configuraciones predefinidas para diferentes escenarios"""
    
    @staticmethod
    def medical_standard() -> ConfidenceConfig:
        """Configuración estándar para casos médicos"""
        return ConfidenceConfig(
            min_confidence=0.0,
            max_confidence=1.0,
            base_confidence=0.5,
            sigmoid_steepness=4.0,
            severity_multipliers={
                'none': 1.0,
                'minimal': 1.1,
                'moderate': 1.3,
                'severe': 1.5
            },
            complexity_factors={
                'simple': 1.0,
                'moderate': 1.2,
                'complex': 1.4,
                'critical': 1.6
            }
        )
    
    @staticmethod
    def conservative() -> ConfidenceConfig:
        """Configuración conservadora (menos agresiva)"""
        return ConfidenceConfig(
            min_confidence=0.0,
            max_confidence=1.0,
            base_confidence=0.5,
            sigmoid_steepness=6.0,  # Más pronunciada
            severity_multipliers={
                'none': 1.0,
                'minimal': 1.05,
                'moderate': 1.15,
                'severe': 1.25
            },
            complexity_factors={
                'simple': 1.0,
                'moderate': 1.1,
                'complex': 1.2,
                'critical': 1.3
            }
        )
    
    @staticmethod
    def aggressive() -> ConfidenceConfig:
        """Configuración agresiva (más sensible)"""
        return ConfidenceConfig(
            min_confidence=0.0,
            max_confidence=1.0,
            base_confidence=0.5,
            sigmoid_steepness=2.0,  # Menos pronunciada
            severity_multipliers={
                'none': 1.0,
                'minimal': 1.2,
                'moderate': 1.5,
                'severe': 1.8
            },
            complexity_factors={
                'simple': 1.0,
                'moderate': 1.3,
                'complex': 1.6,
                'critical': 1.9
            }
        )

# Función de conveniencia para uso directo
def calculate_confidence_simple(base_score: float,
                              severity_level: str = 'moderate',
                              complexity_level: str = 'moderate') -> float:
    """
    Función de conveniencia para cálculo simple de confianza
    
    Args:
        base_score: Score base de confianza (0.0-1.0)
        severity_level: Nivel de severidad
        complexity_level: Nivel de complejidad
        
    Returns:
        float: Score de confianza normalizado
    """
    calculator = ConfidenceCalculator()
    return calculator.calculate_confidence(base_score, severity_level, complexity_level)

if __name__ == "__main__":
    # Ejemplo de uso
    logging.basicConfig(level=logging.INFO)
    
    # Crear calculadora con configuración estándar
    calculator = ConfidenceCalculator()
    
    # Casos de prueba
    test_cases = [
        {'base_score': 0.8, 'severity_level': 'severe', 'complexity_level': 'critical'},
        {'base_score': 0.5, 'severity_level': 'moderate', 'complexity_level': 'moderate'},
        {'base_score': 0.3, 'severity_level': 'minimal', 'complexity_level': 'simple'},
    ]
    
    print("🧪 Testing ConfidenceCalculator")
    print("=" * 50)
    
    for i, case in enumerate(test_cases, 1):
        confidence = calculator.calculate_confidence(**case)
        print(f"Caso {i}: {case} -> Confianza: {confidence:.3f}")
    
    # Estadísticas
    confidences = calculator.batch_calculate_confidence(test_cases)
    stats = calculator.get_confidence_statistics(confidences)
    
    print("\n📊 Estadísticas:")
    print(f"  Count: {stats['count']}")
    print(f"  Min: {stats['min']:.3f}")
    print(f"  Max: {stats['max']:.3f}")
    print(f"  Mean: {stats['mean']:.3f}")
    print(f"  Std: {stats['std']:.3f}")
    print(f"  In Range: {stats['in_range']:.1f}%")
    
    print("\n✅ Todos los scores están en rango [0.0, 1.0]")
