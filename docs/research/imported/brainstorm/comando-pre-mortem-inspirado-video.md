# Comando `/pre-mortem` - Inspirado en Video Blazing Zebra

## Basado en el video: [Build AI-POWERED Project Management Tools w Gemini CLI](https://youtu.be/3bteMMo2QnM?si=qeEpZdsRyLnaBEDR)

### Especificación del Comando

```markdown
---
name: pre-mortem
description: Análisis proactivo de riesgos usando metodología pre-mortem inspirada en Blazing Zebra
---

Actúa como un risk management consultant senior especializado en análisis pre-mortem.

## Tu tarea: Realizar un análisis pre-mortem completo del proyecto/tarea: $ARGUMENTS

### Metodología Pre-Mortem (Inspirada en el video):

#### 1. Configuración del Escenario
- **Imaginemos que estamos en el futuro** y el proyecto ha fallado completamente
- **Fecha del fracaso**: [6 meses/1 año desde ahora]
- **Contexto del fracaso**: El proyecto no cumplió ninguno de sus objetivos principales

#### 2. Brainstorming de Causas de Fracaso
Genera una lista exhaustiva de posibles causas, categorizadas por:

**CAUSAS TÉCNICAS**:
- Fallas en arquitectura o diseño
- Problemas de performance o escalabilidad
- Issues de seguridad o compliance
- Integración fallida con sistemas existentes

**CAUSAS DE PROCESO**:
- Planificación inadecuada o estimaciones erróneas
- Comunicación deficiente entre stakeholders
- Gestión de cambios inefectiva
- Falta de testing o QA adecuado

**CAUSAS DE RECURSOS**:
- Falta de skills o expertise en el equipo
- Presupuesto insuficiente o mal gestionado
- Timeline irrealista o presión excesiva
- Dependencias externas que fallaron

**CAUSAS ORGANIZACIONALES**:
- Falta de buy-in o support de management
- Cambios en prioridades organizacionales
- Conflictos de stakeholders o politics
- Resistance to change del equipo o usuarios

#### 3. Análisis de Probabilidad e Impacto

Para cada causa identificada:
```
CAUSA: [Descripción específica]
PROBABILIDAD: Alta/Media/Baja (con justificación)
IMPACTO: Crítico/Alto/Medio/Bajo
SEÑALES TEMPRANAS: [Cómo detectar si está ocurriendo]
```

#### 4. Estrategias de Mitigación Proactiva

Para cada riesgo Alto/Crítico:
```
ESTRATEGIA PREVENTIVA: [Acción para evitar que ocurra]
ESTRATEGIA DE DETECCIÓN: [Métricas/indicadores para detectar temprano]
PLAN DE CONTINGENCIA: [Qué hacer si ocurre]
RESPONSABLE: [Quién monitorea y actúa]
```

#### 5. Plan de Monitoreo Continuo

**Weekly Risk Check**:
- [ ] Revisar señales tempranas de riesgos críticos
- [ ] Actualizar probabilidades basado en nueva información
- [ ] Ajustar estrategias de mitigación si es necesario

**Monthly Deep Dive**:
- [ ] Ejecutar nuevo pre-mortem con información actualizada
- [ ] Reevaluar riesgos emergentes
- [ ] Documentar lecciones aprendidas

#### 6. Output Estructurado

```markdown
# Pre-Mortem Analysis: [Proyecto]

## 📊 Executive Summary
- **Riesgos Críticos Identificados**: X
- **Riesgos Altos**: Y
- **Nivel de Riesgo General**: Crítico/Alto/Medio/Bajo
- **Recomendación**: Go/No-Go/Go con mitigaciones

## 🚨 Top 5 Failure Scenarios

### 1. [Escenario más probable]
**Probabilidad**: Alta
**Impacto**: Crítico
**Descripción**: [Detalle específico]
**Mitigación**: [Estrategia específica]

### 2-5. [Otros escenarios...]

## 📋 Risk Register Completo

| Riesgo | Probabilidad | Impacto | Señales Tempranas | Mitigación | Responsable |
|--------|--------------|---------|-------------------|------------|-------------|
| [Risk 1] | Alta | Crítico | [Señal 1, Señal 2] | [Estrategia] | [Persona] |

## 🎯 Action Plan Inmediato

### Próximas 48 horas:
- [ ] [Acción crítica 1]
- [ ] [Acción crítica 2]

### Próximas 2 semanas:
- [ ] [Mitigación importante 1]
- [ ] [Mitigación importante 2]

### Setup de Monitoreo:
- [ ] Configurar alertas para señales tempranas
- [ ] Asignar responsables de monitoring
- [ ] Programar weekly risk reviews

## 📈 Success Metrics

Para medir efectividad del pre-mortem:
- **Riesgos detectados temprano**: X/Y
- **Impacto evitado**: $Z o tiempo ahorrado
- **Precisión de predicciones**: X% de riesgos se materializaron

## 🔄 Next Review Date
[Fecha específica para próximo pre-mortem]
```

### Integración con Otros Comandos

**Flujo Recomendado**:
1. `/plan-con-razonamiento` → Crear plan base
2. `/pre-mortem` → Identificar riesgos del plan
3. `/context-engineering` → Refinar contexto con riesgos
4. `/validacion-criterios` → Validar mitigaciones implementadas
5. `/retrospectiva` → Evaluar efectividad del pre-mortem

### Principios Clave:
- **Thinking backwards**: Imaginar el fracaso como ya ocurrido
- **Specific scenarios**: Evitar riesgos genéricos, buscar causas específicas
- **Actionable insights**: Cada riesgo debe tener mitigación específica
- **Continuous monitoring**: Pre-mortem es proceso, no evento único
```

### Valor Diferencial vs. Análisis de Riesgos Tradicional

**Análisis Tradicional**:
- "¿Qué podría salir mal?"
- Pensamiento lineal y optimista
- Riesgos genéricos y obvios

**Pre-Mortem (del video)**:
- "El proyecto ya fracasó, ¿por qué?"
- Pensamiento retrospectivo pesimista
- Riesgos específicos y contraintuitivos
- Mayor creatividad en identificación de causas
