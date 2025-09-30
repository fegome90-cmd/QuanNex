# 🔍 **ANÁLISIS COMPLETO: ENTRADAS DE DATOS, PESOS Y SISTEMA HARD RULES**

## 📅 **FECHA**: Agosto 31, 2025
## 🎯 **PROYECTO**: WCAI2-ALFA - Motor RETE
## 🔗 **OBJETIVO**: Entender el flujo de datos, pesos y sistema de hard rules

---

## 🚨 **PROBLEMA IDENTIFICADO: SISTEMA HARD RULES**

### **¿Por qué Hard Rules?**

El motor RETE actual utiliza un sistema de **hard rules** (reglas duras) por las siguientes razones:

#### **1. 🎯 Seguridad Médica**
```python
# Hard rules garantizan decisiones predecibles y seguras
if hemorrhage_level == "severe":
    recommendation = "hemostatic_agent_advanced"  # ✅ Siempre igual
    confidence = 0.95  # ✅ Consistente
```

#### **2. 🎯 Cumplimiento Regulatorio**
- **FDA/CE Marking**: Productos médicos requieren decisiones basadas en evidencia
- **Auditabilidad**: Cada decisión debe ser trazable a una regla específica
- **Consistencia**: Mismos inputs = mismos outputs (crítico en medicina)

#### **3. 🎯 Interpretabilidad Clínica**
```python
# Los médicos pueden entender exactamente por qué se tomó una decisión
rationale = "Hemorrhage severa requiere agentes hemostáticos inmediatos"
# ✅ Explicación clara y directa
```

---

## 📊 **ANÁLISIS DE ENTRADAS DE DATOS**

### **1. 🎯 Fuentes de Datos Principales**

#### **A. WoundAssessment (Entrada Principal)**
```python
@dataclass
class WoundAssessment:
    # Características básicas
    wound_type: str          # Tipo de herida
    wound_size: str          # Tamaño (small, medium, large)
    location: str            # Ubicación general
    
    # TIMEROP Integration
    timerop: TimeropVariables # Variables TIMEROP detalladas
    timerop_score: int       # Score calculado (0-10)
    
    # Hemorrhage Assessment
    hemorrhage_level: str    # none, minimal, moderate, severe
    bleeding_control: str    # not_required, basic, advanced
    
    # Parámetros clínicos
    exudate_level: str       # none, low, moderate, high
    infection_status: str    # none, suspected, present, severe
    pain_level: str          # mild, moderate, severe
    
    # Contexto de tratamiento
    previous_treatments: List[str]  # Tratamientos previos
    allergies: List[str]           # Alergias del paciente
    contraindications: List[str]   # Contraindicaciones
```

#### **B. TimeropVariables (Sistema TIMEROP)**
```python
@dataclass
class TimeropVariables:
    tissue_quality: str      # healthy, necrotic, slough, mixed
    infection_level: str     # none, mild, moderate, severe
    moisture_level: str      # dry, balanced, excessive
    edge_condition: str      # attached, rolled, undermined
    repair_phase: str        # inflammation, proliferation, remodeling
    oxygenation: str         # poor, adequate, good
    patient_factors: List[str] # diabetes, immunocompromised, etc.
```

### **2. 🎯 Cálculo del Score TIMEROP**

#### **Algoritmo de Scoring:**
```python
def calculate_timerop_score(self) -> int:
    score = 0
    
    # Tissue scoring (0-4 puntos)
    tissue_scores = {
        "healthy": 0,    # ✅ Tejido sano
        "slough": 2,     # ⚠️ Tejido necrótico suave
        "necrotic": 4,   # ❌ Tejido necrótico duro
        "mixed": 3       # ⚠️ Mezcla de tejidos
    }
    score += tissue_scores.get(self.tissue_quality, 1)
    
    # Infection scoring (0-4 puntos)
    infection_scores = {
        "none": 0,       # ✅ Sin infección
        "mild": 1,       # ⚠️ Infección leve
        "moderate": 2,   # ⚠️ Infección moderada
        "severe": 4      # ❌ Infección severa
    }
    score += infection_scores.get(self.infection_level, 0)
    
    # Moisture scoring (0-2 puntos)
    moisture_scores = {
        "dry": 2,        # ❌ Demasiado seco
        "balanced": 0,   # ✅ Humedad balanceada
        "excessive": 2   # ❌ Exceso de humedad
    }
    score += moisture_scores.get(self.moisture_level, 1)
    
    # Edge condition scoring (0-2 puntos)
    edge_scores = {
        "attached": 0,   # ✅ Bordes adheridos
        "rolled": 1,     # ⚠️ Bordes enrollados
        "undermined": 2  # ❌ Bordes socavados
    }
    score += edge_scores.get(self.edge_condition, 1)
    
    # Patient factors (1 punto por factor de riesgo)
    score += len(self.patient_factors)
    
    return min(score, 10)  # Cap at 10
```

#### **Interpretación del Score:**
- **0-2**: Herida simple, bajo riesgo
- **3-5**: Herida moderada, riesgo medio
- **6-8**: Herida compleja, alto riesgo
- **9-10**: Herida crítica, riesgo muy alto

---

## ⚖️ **ANÁLISIS DE PESOS Y MULTIPLICADORES**

### **1. 🎯 Pesos en Reglas Médicas**

#### **A. RuleCondition Weights**
```python
@dataclass
class RuleCondition:
    field: str
    operator: str
    value: Any
    weight: float = 1.0  # ⚖️ Peso de la condición
```

#### **B. Cálculo de Match Score**
```python
def _evaluate_rule(self, rule: MedicalRule, assessment: Dict[str, Any]) -> float:
    total_weight = 0
    matched_weight = 0
    
    for condition in rule.conditions:
        total_weight += condition.weight  # Suma todos los pesos
        
        if condition.field in assessment:
            value = assessment[condition.field]
            
            if self._check_condition(value, condition.operator, condition.value):
                matched_weight += condition.weight  # Suma pesos de condiciones que matchean
    
    return matched_weight / total_weight if total_weight > 0 else 0
```

### **2. 🎯 Multiplicadores de Confianza**

#### **A. Antimicrobial Multipliers (Sesgo Antimicrobiano)**
```python
def _load_antimicrobial_multipliers(self) -> Dict[str, float]:
    scheme = os.getenv("WCAI2_BIAS_SCHEME", "baseline").lower()
    presets = {
        "baseline": {
            "suspected": 0.6,  # ⚠️ Sospecha: reducir antimicrobianos
            "none": 0.4,       # ❌ Sin infección: evitar antimicrobianos
            "absent": 0.4,     # ❌ Ausente: evitar antimicrobianos
            "present": 1.0,    # ✅ Presente: antimicrobianos apropiados
            "severe": 1.1      # ⚠️ Severa: aumentar antimicrobianos
        },
        "conservative": {
            "suspected": 0.5,  # Más conservador
            "none": 0.3,
            "absent": 0.3,
            "present": 0.95,
            "severe": 1.05
        },
        "aggressive": {
            "suspected": 0.8,  # Menos conservador
            "none": 0.6,
            "absent": 0.6,
            "present": 1.05,
            "severe": 1.2
        }
    }
```

#### **B. Rule Confidence Factors**
```python
def _load_rule_confidence_factors(self) -> Dict[str, float]:
    presets = {
        "baseline": {
            "advanced_dressing_antimicrobial": 1.0,
            "antimicrobial_hemostatic_advanced": 1.0,
            "hydrocolloid_dressing": 1.0
        },
        "conservative": {
            "advanced_dressing_antimicrobial": 0.9,  # Reducir antimicrobianos
            "antimicrobial_hemostatic_advanced": 0.9,
            "hydrocolloid_dressing": 1.05  # Aumentar hidrocoloides
        },
        "aggressive": {
            "advanced_dressing_antimicrobial": 1.1,  # Aumentar antimicrobianos
            "antimicrobial_hemostatic_advanced": 1.1,
            "hydrocolloid_dressing": 0.95  # Reducir hidrocoloides
        }
    }
```

### **3. 🎯 Cálculo Final de Confianza**

#### **Proceso de Cálculo:**
```python
# 1. Base confidence de la regla
confidence = rule.confidence_base * match_score

# 2. Aplicar multiplicador antimicrobiano si aplica
if rule.recommendation in ("advanced_dressing_antimicrobial", "antimicrobial_hemostatic_advanced"):
    mult = self.antimicrobial_multipliers.get(infection_status, 1.0)
    confidence *= mult

# 3. Aplicar factor de confianza específico de la regla
confidence *= self.rule_confidence_factors.get(rule.recommendation, 1.0)

# 4. Clamp a rango [0, 1]
confidence = max(0.0, min(1.0, confidence))
```

---

## 🔧 **SISTEMA DE HARD RULES**

### **1. 🎯 Estructura de Reglas**

#### **A. MedicalRule**
```python
@dataclass  
class MedicalRule:
    name: str                    # Nombre de la regla
    conditions: List[RuleCondition]  # Condiciones que deben cumplirse
    recommendation: str          # Recomendación específica
    rationale: str              # Justificación clínica
    confidence_base: float      # Confianza base de la regla
    priority: int = 1           # Prioridad de la regla
```

#### **B. Tipos de Reglas Implementadas**

##### **TIMEROP Rules:**
```python
# Regla para TIMEROP alto sin infección confirmada
MedicalRule(
    name="high_timerop_chronic",
    conditions=[
        RuleCondition("timerop_score", "gt", 8),
        RuleCondition("wound_type", "contains", "chronic")
    ],
    recommendation="hydrocolloid_dressing",
    rationale="TIMEROP alto sin infección confirmada: preferir manejo avanzado no antimicrobiano",
    confidence_base=0.85,
    priority=1
)
```

##### **Hemorrhage Rules:**
```python
# Regla para hemorrhage severa
MedicalRule(
    name="severe_hemorrhage_control",
    conditions=[
        RuleCondition("hemorrhage_level", "eq", "severe")
    ],
    recommendation="hemostatic_agent_advanced",
    rationale="Hemorrhage severa requiere agentes hemostáticos inmediatos",
    confidence_base=0.95,
    priority=1
)
```

##### **Combined Rules:**
```python
# Regla para combinación de alto riesgo
MedicalRule(
    name="high_risk_combination",
    conditions=[
        RuleCondition("timerop_score", "gt", 7),
        RuleCondition("hemorrhage_level", "in", ["moderate", "severe"]),
        RuleCondition("infection_status", "eq", "present")
    ],
    recommendation="antimicrobial_hemostatic_advanced",
    rationale="Combinación de alto riesgo: TIMEROP alto + hemorrhage + infección",
    confidence_base=0.95,
    priority=1
)
```

### **2. 🎯 Evaluación de Reglas**

#### **A. Proceso de Matching:**
```python
def _evaluate_rule(self, rule: MedicalRule, assessment: Dict[str, Any]) -> float:
    total_weight = 0
    matched_weight = 0
    
    for condition in rule.conditions:
        total_weight += condition.weight
        
        if condition.field in assessment:
            value = assessment[condition.field]
            
            if self._check_condition(value, condition.operator, condition.value):
                matched_weight += condition.weight
    
    return matched_weight / total_weight if total_weight > 0 else 0
```

#### **B. Operadores de Condición:**
```python
def _check_condition(self, value: Any, operator: str, target: Any) -> bool:
    if operator == "eq":
        return value == target
    elif operator == "gt": 
        return value > target
    elif operator == "lt":
        return value < target
    elif operator == "in":
        return value in target
    elif operator == "contains":
        return target in str(value)
    return False
```

---

## 🎯 **PROBLEMAS IDENTIFICADOS EN EL SISTEMA ACTUAL**

### **1. 🚨 Problemas de Hard Rules**

#### **A. Rigidez Excesiva**
```python
# ❌ PROBLEMA: Reglas muy específicas
if timerop_score > 8 and wound_type == "chronic":
    recommendation = "hydrocolloid_dressing"  # Siempre igual

# ❌ PROBLEMA: No considera variaciones individuales
# No hay adaptación a casos específicos del paciente
```

#### **B. Falta de Aprendizaje**
```python
# ❌ PROBLEMA: No aprende de resultados previos
# Las reglas son estáticas, no se adaptan
# No hay feedback loop para mejorar decisiones
```

#### **C. Sesgos Hardcoded**
```python
# ❌ PROBLEMA: Sesgos antimicrobianos hardcoded
antimicrobial_multipliers = {
    "suspected": 0.6,  # Sesgo contra antimicrobianos
    "none": 0.4,       # Sesgo fuerte contra antimicrobianos
}
```

### **2. 🚨 Problemas de Pesos**

#### **A. Pesos Estáticos**
```python
# ❌ PROBLEMA: Pesos no se adaptan
weight: float = 1.0  # Siempre igual para todas las condiciones
```

#### **B. Falta de Contexto**
```python
# ❌ PROBLEMA: No considera contexto completo
# Solo evalúa condiciones individuales, no interacciones
```

### **3. 🚨 Problemas de Entradas de Datos**

#### **A. Validación Limitada**
```python
# ❌ PROBLEMA: Validación básica
if self.hemorrhage_level not in [e.value for e in HemorrhageLevel]:
    raise ValueError(f"Invalid hemorrhage level: {self.hemorrhage_level}")
# No valida coherencia entre múltiples campos
```

#### **B. Datos Faltantes**
```python
# ❌ PROBLEMA: No maneja bien datos faltantes
if condition.field in assessment:  # Solo verifica existencia
    # No valida calidad o completitud de datos
```

---

## 🛠️ **SOLUCIONES PROPUESTAS**

### **1. 🔧 Sistema de Reglas Adaptativo**

#### **A. Reglas Dinámicas**
```python
@dataclass
class AdaptiveRule:
    name: str
    conditions: List[RuleCondition]
    recommendation: str
    confidence_base: float
    priority: int = 1
    
    # Nuevos campos para adaptabilidad
    success_rate: float = 0.5      # Tasa de éxito histórica
    usage_count: int = 0           # Veces que se ha usado
    last_updated: datetime = None  # Última actualización
    adaptation_factor: float = 1.0 # Factor de adaptación
```

#### **B. Aprendizaje de Resultados**
```python
def update_rule_performance(self, rule_name: str, outcome: str):
    """Actualiza performance de una regla basado en resultados"""
    rule = self.get_rule_by_name(rule_name)
    if rule:
        rule.usage_count += 1
        
        if outcome == "success":
            rule.success_rate = (rule.success_rate * (rule.usage_count - 1) + 1) / rule.usage_count
        else:
            rule.success_rate = (rule.success_rate * (rule.usage_count - 1) + 0) / rule.usage_count
        
        # Ajustar factor de adaptación
        rule.adaptation_factor = 0.5 + (rule.success_rate * 0.5)
```

### **2. 🔧 Pesos Dinámicos**

#### **A. Pesos Contextuales**
```python
@dataclass
class ContextualWeight:
    base_weight: float = 1.0
    context_multipliers: Dict[str, float] = field(default_factory=dict)
    
    def calculate_weight(self, context: Dict[str, Any]) -> float:
        weight = self.base_weight
        
        for context_key, multiplier in self.context_multipliers.items():
            if context_key in context:
                weight *= multiplier
        
        return weight
```

#### **B. Aprendizaje de Pesos**
```python
def learn_optimal_weights(self, training_data: List[Dict]):
    """Aprende pesos óptimos de datos de entrenamiento"""
    for case in training_data:
        actual_outcome = case["outcome"]
        predicted_outcome = self.predict_outcome(case["assessment"])
        
        # Ajustar pesos basado en error
        error = self.calculate_error(actual_outcome, predicted_outcome)
        self.adjust_weights(error, case["assessment"])
```

### **3. 🔧 Validación Avanzada de Datos**

#### **A. Validación de Coherencia**
```python
def validate_assessment_coherence(self, assessment: WoundAssessment) -> List[str]:
    """Valida coherencia entre diferentes campos del assessment"""
    warnings = []
    
    # Validar coherencia TIMEROP vs hemorrhage
    if assessment.timerop_score > 8 and assessment.hemorrhage_level == "none":
        warnings.append("TIMEROP alto con hemorrhage mínima: verificar datos")
    
    # Validar coherencia infección vs antimicrobianos previos
    if assessment.infection_status == "severe" and "antimicrobial" not in assessment.previous_treatments:
        warnings.append("Infección severa sin antimicrobianos previos: verificar historia")
    
    return warnings
```

#### **B. Manejo de Datos Faltantes**
```python
def handle_missing_data(self, assessment: Dict[str, Any]) -> Dict[str, Any]:
    """Maneja datos faltantes de manera inteligente"""
    completed_assessment = assessment.copy()
    
    # Imputar valores faltantes basado en patrones
    if "timerop_score" not in completed_assessment:
        completed_assessment["timerop_score"] = self.impute_timerop_score(assessment)
    
    if "hemorrhage_level" not in completed_assessment:
        completed_assessment["hemorrhage_level"] = self.impute_hemorrhage_level(assessment)
    
    return completed_assessment
```

---

## 📊 **MÉTRICAS DE EVALUACIÓN**

### **1. 🎯 Métricas de Hard Rules**

#### **A. Precisión de Reglas**
```python
def calculate_rule_accuracy(self) -> Dict[str, float]:
    """Calcula precisión de cada regla"""
    accuracies = {}
    
    for rule in self.medical_rules:
        correct_predictions = 0
        total_predictions = 0
        
        for case in self.validation_data:
            if self._evaluate_rule(rule, case["assessment"]) > 0.5:
                total_predictions += 1
                if case["outcome"] == rule.recommendation:
                    correct_predictions += 1
        
        accuracies[rule.name] = correct_predictions / total_predictions if total_predictions > 0 else 0
    
    return accuracies
```

#### **B. Cobertura de Reglas**
```python
def calculate_rule_coverage(self) -> Dict[str, float]:
    """Calcula cobertura de cada regla"""
    coverage = {}
    
    for rule in self.medical_rules:
        matches = 0
        total_cases = len(self.validation_data)
        
        for case in self.validation_data:
            if self._evaluate_rule(rule, case["assessment"]) > 0.5:
                matches += 1
        
        coverage[rule.name] = matches / total_cases
    
    return coverage
```

### **2. 🎯 Métricas de Pesos**

#### **A. Importancia de Pesos**
```python
def calculate_weight_importance(self) -> Dict[str, float]:
    """Calcula importancia de cada peso"""
    importance = {}
    
    for field in self.assessment_fields:
        # Usar técnica de permutación para calcular importancia
        baseline_score = self.calculate_baseline_score()
        
        # Permutar valores del campo
        permuted_score = self.calculate_permuted_score(field)
        
        # Importancia = diferencia en score
        importance[field] = abs(baseline_score - permuted_score)
    
    return importance
```

---

## 🚀 **PLAN DE MEJORAS**

### **Fase 1: Validación y Coherencia (1-2 días)**
1. ✅ Implementar validación de coherencia de datos
2. ✅ Mejorar manejo de datos faltantes
3. ✅ Crear métricas de calidad de datos

### **Fase 2: Pesos Dinámicos (2-3 días)**
1. ✅ Implementar sistema de pesos contextuales
2. ✅ Crear algoritmo de aprendizaje de pesos
3. ✅ Validar mejora en precisión

### **Fase 3: Reglas Adaptativas (3-4 días)**
1. ✅ Migrar a sistema de reglas adaptativas
2. ✅ Implementar aprendizaje de resultados
3. ✅ Crear métricas de performance

### **Fase 4: Integración y Testing (2-3 días)**
1. ✅ Integrar todas las mejoras
2. ✅ Tests exhaustivos
3. ✅ Validación clínica

---

## 🎯 **CONCLUSIÓN**

### **Estado Actual:**
- ✅ **Hard Rules**: Sistema funcional pero rígido
- ✅ **Pesos**: Estáticos pero predecibles
- ✅ **Entradas**: Validadas básicamente
- ❌ **Adaptabilidad**: Limitada
- ❌ **Aprendizaje**: No implementado

### **Beneficios del Sistema Actual:**
- **Seguridad**: Decisiones predecibles y auditables
- **Cumplimiento**: Cumple requisitos regulatorios
- **Interpretabilidad**: Fácil de entender para médicos

### **Limitaciones Identificadas:**
- **Rigidez**: No se adapta a casos específicos
- **Sesgos**: Hardcoded en multiplicadores
- **Falta de aprendizaje**: No mejora con el tiempo

### **Próximos Pasos:**
1. **Mantener hard rules** para casos críticos
2. **Agregar adaptabilidad** para casos complejos
3. **Implementar aprendizaje** para mejora continua
4. **Validar coherencia** de datos de entrada

---

**📅 Fecha de Análisis**: Agosto 31, 2025  
**🎯 Analista**: Claude Assistant con Archon MCP  
**📊 Estado**: ANÁLISIS COMPLETO - SISTEMA HARD RULES ENTENDIDO  
**🚀 Resultado**: Identificación de problemas y soluciones para sistema adaptativo
