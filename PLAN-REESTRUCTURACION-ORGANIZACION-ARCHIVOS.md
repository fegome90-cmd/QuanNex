# PLAN DE REESTRUCTURACIÓN DE ORGANIZACIÓN DE ARCHIVOS

**Fecha:** 2025-09-30T20:15:00Z  
**Proyecto:** StartKit Main - Reestructuración de Organización  
**Objetivo:** Optimizar la estructura de archivos y carpetas aplicando principios MCP y Toyota Production System

## 🎯 APORTES DEL MCP EN LA PLANIFICACIÓN

### **Análisis Contextual (Agente Context)**
El MCP me proporcionó:
- **Context bundle** con información arquitectónica del proyecto
- **Provenance** de fuentes analizadas (CLAUDE.md, MANUAL-COMPLETO-CURSOR.md, README.md)
- **Stats** de tokens y chunks procesados
- **Trace** de ejecución exitosa

### **Generación de Plan (Agente Prompting)**
El MCP generó:
- **System prompt** técnico con constraints específicos
- **User prompt** enfocado en reestructuración
- **Guardrails** para mantener compatibilidad MCP
- **Context references** a documentos clave

### **Validación de Políticas (Agente Rules)**
El MCP validó:
- **Rules compiled** desde políticas de escritura y limpieza
- **Violations** (ninguna detectada)
- **Advice** sobre tono formal y dominio software-development
- **Trace** de validación exitosa

## 📊 ANÁLISIS DE ESTRUCTURA ACTUAL

### **Problemas Identificados**

#### **1. Duplicación de Directorios**
```
❌ templates/ (raíz) + core/templates/
❌ scripts/ (raíz) + core/scripts/
❌ docs/ (múltiples ubicaciones)
❌ agents/ (dispersos en múltiples ubicaciones)
```

#### **2. Organización Inconsistente**
```
❌ analisis-* (múltiples directorios de análisis)
❌ archivos-organizados/ (directorio temporal)
❌ external/ (proyectos externos mezclados)
❌ antigeneric-agents/ (proyecto externo en raíz)
```

#### **3. Separación Inadecuada**
```
❌ Proyectos internos vs externos mezclados
❌ Documentación dispersa
❌ Análisis temporales en raíz
❌ Configuraciones duplicadas
```

## 🏗️ PROPUESTA DE REESTRUCTURACIÓN

### **Estructura Propuesta (Principios MCP + Toyota)**

```
startkit-main/
├── 📁 core/                          # Núcleo del sistema (MCP)
│   ├── agents/                       # Agentes MCP core
│   │   ├── context/
│   │   ├── prompting/
│   │   └── rules/
│   ├── scripts/                      # Scripts core
│   ├── templates/                    # Plantillas core
│   └── schemas/                      # Esquemas de validación
├── 📁 orchestration/                 # Sistema de orquestación
│   ├── workflows/
│   ├── schemas/
│   └── tests/
├── 📁 tools/                         # Herramientas del sistema
│   ├── bench-agents.mjs
│   ├── cleanup.mjs
│   └── path-lint.mjs
├── 📁 docs/                          # Documentación unificada
│   ├── architecture/
│   ├── agents/
│   ├── workflows/
│   └── reference/
├── 📁 projects/                      # Proyectos generados
│   └── examples/
├── 📁 research/                      # Investigación y análisis
│   ├── motor-rete/
│   ├── seguridad/
│   └── orquestador/
├── 📁 external/                      # Proyectos externos
│   ├── archon/
│   └── antigeneric-agents/
├── 📁 data/                          # Datos del sistema
│   ├── payloads/
│   ├── test-data/
│   └── migration/
└── 📁 config/                        # Configuraciones
    ├── policies/
    ├── schemas/
    └── workflows/
```

## 🔄 PLAN DE MIGRACIÓN DETALLADO

### **Fase 1: Consolidación Core (MCP)**

#### **1.1 Agentes MCP Core**
```bash
# Mover agentes core a core/agents/
mv agents/context core/agents/
mv agents/prompting core/agents/
mv agents/rules core/agents/

# Eliminar agentes no-core
rm -rf agents/docsync agents/lint agents/orchestrator agents/refactor agents/secscan agents/tests
```

#### **1.2 Scripts Core**
```bash
# Consolidar scripts en core/scripts/
mv scripts/* core/scripts/ 2>/dev/null || true
rmdir scripts/
```

#### **1.3 Templates Core**
```bash
# Consolidar templates en core/templates/
mv templates/* core/templates/ 2>/dev/null || true
rmdir templates/
```

### **Fase 2: Organización de Documentación**

#### **2.1 Documentación Unificada**
```bash
# Crear estructura de docs/
mkdir -p docs/{architecture,agents,workflows,reference}

# Mover documentación existente
mv docs/agents/* docs/agents/ 2>/dev/null || true
mv docs/adr docs/architecture/
mv docs/rfc docs/architecture/
mv docs/ci docs/workflows/
```

#### **2.2 Documentación de Análisis**
```bash
# Mover análisis a research/
mkdir -p research/{motor-rete,seguridad,orquestador,proyecto-general}
mv analisis-motor-rete/* research/motor-rete/
mv analisis-seguridad-proyecto/* research/seguridad/
mv analisis-sistema-orquestador/* research/orquestador/
mv analisis-proyecto-general/* research/proyecto-general/
```

### **Fase 3: Separación de Proyectos**

#### **3.1 Proyectos Externos**
```bash
# Mover proyectos externos a external/
mkdir -p external/{archon,antigeneric-agents}
mv archon/* external/archon/
mv antigeneric-agents/* external/antigeneric-agents/
```

#### **3.2 Proyectos Generados**
```bash
# Crear directorio para proyectos generados
mkdir -p projects/examples
mv examples/* projects/examples/
```

### **Fase 4: Organización de Datos**

#### **4.1 Datos del Sistema**
```bash
# Consolidar datos en data/
mkdir -p data/{payloads,test-data,migration}
mv payloads/* data/payloads/
mv test-data/* data/test-data/
mv migration/* data/migration/
```

#### **4.2 Configuraciones**
```bash
# Consolidar configuraciones en config/
mkdir -p config/{policies,schemas,workflows}
mv policies/* config/policies/
mv schemas/* config/schemas/
```

## 📋 VALIDACIONES POST-REESTRUCTURACIÓN

### **Checklist de Verificación MCP**

#### **Agentes Core**
- [ ] **context** - Funcionando en core/agents/context/
- [ ] **prompting** - Funcionando en core/agents/prompting/
- [ ] **rules** - Funcionando en core/agents/rules/
- [ ] **Health checks** - Todos los agentes healthy
- [ ] **Benchmarks** - Métricas estables

#### **Orquestador**
- [ ] **Workflows** - Funcionando en orchestration/
- [ ] **Schemas** - Validación correcta
- [ ] **Tests** - Pasando todos los tests

#### **Herramientas**
- [ ] **path-lint** - Funcionando con nueva estructura
- [ ] **docs-lint** - Validando documentación
- [ ] **bench-agents** - Métricas correctas
- [ ] **cleanup** - Limpieza efectiva

### **Validaciones de Integridad**

#### **Referencias Internas**
- [ ] **Imports** - Actualizados a nuevas rutas
- [ ] **Requires** - Funcionando correctamente
- [ ] **Scripts** - Apuntando a rutas correctas
- [ ] **Documentación** - Referencias actualizadas

#### **Funcionalidad Externa**
- [ ] **CLI** - Comandos funcionando
- [ ] **Templates** - Generación correcta
- [ ] **Workflows** - Ejecución exitosa
- [ ] **CI/CD** - Pipelines funcionando

## 🎯 BENEFICIOS ESPERADOS

### **Mantenibilidad (Principio Toyota)**
- ✅ **Estructura clara** - Separación de responsabilidades
- ✅ **Navegación intuitiva** - Organización lógica
- ✅ **Escalabilidad** - Fácil adición de componentes
- ✅ **Consistencia** - Patrones uniformes

### **Funcionalidad MCP**
- ✅ **Agentes core** - Funcionamiento optimizado
- ✅ **Orquestador** - Coordinación mejorada
- ✅ **Herramientas** - Eficiencia aumentada
- ✅ **Validaciones** - Verificación robusta

### **Separación de Proyectos**
- ✅ **Proyectos internos** - Núcleo del sistema
- ✅ **Proyectos externos** - Separados claramente
- ✅ **Documentación** - Organizada por propósito
- ✅ **Datos** - Consolidados y accesibles

## 🚀 IMPLEMENTACIÓN RECOMENDADA

### **Estrategia de Migración**
1. **Backup completo** del proyecto actual
2. **Migración por fases** - Una fase a la vez
3. **Validación continua** - Tests después de cada fase
4. **Rollback plan** - Reversión si es necesario
5. **Documentación** - Actualización de referencias

### **Orden de Ejecución**
1. **Fase 1** - Consolidación Core (MCP)
2. **Fase 2** - Organización de Documentación
3. **Fase 3** - Separación de Proyectos
4. **Fase 4** - Organización de Datos
5. **Validación Final** - Tests completos

---

**Este plan de reestructuración utiliza los principios MCP para mantener la funcionalidad del sistema mientras aplica principios de organización clara del Toyota Production System, resultando en una estructura más mantenible y escalable.**
