# 🔄 RFC-0001: Development Flow - Filosofía Toyota

## 📅 **Fecha**: December 2024
## 🎯 **Estado**: Implementado
## 👤 **Responsable**: Codex (Planificación) + Claude (Implementación)
## 🚗 **Filosofía**: "Menos (y Mejor) es Más"

---

## 🎯 **DESCRIPCIÓN**

**RFC-0001** define el flujo de desarrollo "Explorar → Planificar → Ejecutar → Confirmar" aplicando la **filosofía Toyota** de mejora continua y calidad sobre cantidad.

---

## 🔄 **FLUJO DE DESARROLLO TOYOTA**

### **📊 FASE 1: EXPLORAR (Codex)**
```
Investigación → Análisis → Identificación de Necesidades
     ↓              ↓              ↓
  Mercado      Competidores    Oportunidades
```

#### **Responsabilidades Codex:**
- [ ] **Investigación de mercado**: Análisis de competidores y tendencias
- [ ] **Identificación de necesidades**: Pain points y oportunidades
- [ ] **Validación de hipótesis**: Confirmar necesidades del usuario
- [ ] **Análisis de viabilidad**: Técnica, económica y de mercado

#### **Entregables Codex:**
- `docs/research/INVENTARIO.md`: Inventario de investigación
- `docs/research/INDEX.md`: Índice principal de investigación
- `docs/research/TRAZABILIDAD.md`: Mapa de investigación → decisiones

### **📋 FASE 2: PLANIFICAR (Codex)**
```
Arquitectura → Estrategia → Roadmap → Plan de Implementación
      ↓           ↓          ↓              ↓
   Stack      Objetivos   Milestones    Responsabilidades
```

#### **Responsabilidades Codex:**
- [ ] **Diseño de arquitectura**: Stack tecnológico y patrones
- [ ] **Planificación estratégica**: Objetivos y milestones
- [ ] **Definición de procesos**: Flujos de trabajo y gates
- [ ] **Asignación de roles**: Responsabilidades del equipo

#### **Entregables Codex:**
- `docs/CHARTER.md`: Objetivos, KPI, entregables, milestones
- `docs/adr/ADR-0001-stack-basico.md`: Stack y decisiones técnicas
- `docs/ci/PLAN.md`: Plan de CI/CD y seguridad
- `docs/rfc/RFC-0001-dev-flow.md`: Este documento

### **🛠️ FASE 3: EJECUTAR (Claude)**
```
Implementación → Configuración → Testing → Validación
      ↓             ↓            ↓          ↓
   Código      Infraestructura  Tests    Gates
```

#### **Responsabilidades Claude:**
- [ ] **Implementación técnica**: Código, scripts, workflows
- [ ] **Configuración de sistemas**: CI/CD, seguridad, monitoreo
- [ ] **Testing y validación**: Ejecución de tests y validaciones
- [ ] **Infraestructura**: Directorios, archivos, configuraciones

#### **Entregables Claude:**
- Estructura de directorios implementada
- Scripts y workflows funcionales
- Configuraciones de seguridad activas
- Tests y validaciones ejecutándose

### **✅ FASE 4: CONFIRMAR (Ambos)**
```
Validación → Testing → Documentación → Mejora Continua
     ↓         ↓          ↓              ↓
   Gates    Healthcheck  Docs        Iteración
```

#### **Responsabilidades Compartidas:**
- [ ] **Validación de gates**: Confirmar cumplimiento de criterios
- [ ] **Testing completo**: Ejecutar todos los tests
- [ ] **Documentación**: Actualizar y validar documentación
- [ ] **Mejora continua**: Identificar y planificar mejoras

---

## 🚨 **GATES DE VALIDACIÓN TOYOTA**

### **✅ Gate A: Fundamentos (DÍA 1)**
#### **Criterios de Aprobación:**
- [ ] **CHARTER.md**: Objetivos, KPI, entregables definidos
- [ ] **INVENTARIO.md**: Investigación catalogada
- [ ] **CODEOWNERS**: Archivos críticos protegidos
- [ ] **Estructura base**: Directorios principales creados

#### **Responsabilidades:**
- **Codex**: Crear CHARTER.md e INVENTARIO.md
- **Claude**: Configurar CODEOWNERS y estructura base

### **✅ Gate B: Investigación (DÍA 2)**
#### **Criterios de Aprobación:**
- [ ] **INDEX.md**: Índice principal de investigación
- [ ] **TRAZABILIDAD.md**: Mapa research → decisiones
- [ ] **Normalización**: Archivos movidos a estructura organizada
- [ ] **Estructura docs/research/**: Organización por fases

#### **Responsabilidades:**
- **Codex**: Crear INDEX.md y TRAZABILIDAD.md
- **Claude**: Ejecutar normalizador y validar estructura

### **✅ Gate C: Arquitectura (DÍA 3)**
#### **Criterios de Aprobación:**
- [ ] **ADR-0001**: Stack y decisiones técnicas definidas
- [ ] **SECURITY.md**: Política de seguridad implementada
- [ ] **Plan de CI**: Estrategia de CI/CD definida
- [ ] **Workflow CI**: Implementación técnica completada

#### **Responsabilidades:**
- **Codex**: Crear ADR-0001, SECURITY.md y PLAN de CI
- **Claude**: Implementar workflow CI y validar funcionamiento

---

## 🔄 **FLUJO DE COORDINACIÓN DIARIA**

### **🌅 INICIO DE DÍA (9:00 AM)**
```
1. Codex: Compartir plan del día y entregables esperados
2. Claude: Confirmar implementaciones pendientes y bloqueos
3. Ambos: Identificar dependencias cruzadas y puntos de coordinación
4. Establecer: Timeline del día y criterios de éxito
```

### **🌆 FIN DE DÍA (6:00 PM)**
```
1. Codex: Reportar progreso, entregables completados y bloqueos
2. Claude: Reportar implementaciones, tests ejecutados y validaciones
3. Ambos: Validar cumplimiento de gates del día
4. Planificar: Siguiente día y ajustes necesarios
```

### **📅 REUNIÓN SEMANAL (Viernes 3:00 PM)**
```
1. Revisión: Progreso de la semana y cumplimiento de objetivos
2. Retrospectiva: Qué funcionó bien y qué mejorar
3. Planificación: Objetivos de la siguiente semana
4. Ajustes: Modificaciones al flujo de trabajo si es necesario
```

---

## 🛠️ **HERRAMIENTAS DE COORDINACIÓN**

### **📋 Documentos de Coordinación:**
- **docs/COORDINACION-CODEX.md**: Estado actual y reglas de coordinación
- **docs/rfc/0001-dev-flow/RFC-0001-dev-flow.md**: Este documento
- **docs/research/TRAZABILIDAD.md**: Mapa de investigación → decisiones

### **🔧 Scripts de Automatización:**
- **scripts/normalize-research.sh**: Normalización de investigación
- **scripts/healthcheck.sh**: Verificación de salud del proyecto
- **scripts/test-claude-init.sh**: Testing del inicializador

### **📊 Métricas de Progreso:**
- **Gates completados**: Porcentaje de gates aprobados
- **Entregables**: Cantidad de entregables completados
- **Tiempo de ciclo**: Días para completar cada fase
- **Calidad**: Tests pasando y validaciones exitosas

---

## 🚀 **FILOSOFÍA TOYOTA APLICADA**

### **"Menos (y Mejor) es Más"**
- **Foco en calidad**: Cada gate debe cumplir criterios estrictos
- **Eliminación de desperdicios**: No documentar lo innecesario
- **Simplicidad**: Procesos claros y directos

### **"Mejora Continua"**
- **Iteración diaria**: Revisar y ajustar el flujo cada día
- **Retrospectiva semanal**: Identificar mejoras y implementarlas
- **Adaptación**: Ajustar el flujo según necesidades del proyecto

### **"Calidad sobre Cantidad"**
- **Gates estrictos**: Solo aprobar cuando se cumplan todos los criterios
- **Testing exhaustivo**: Validar cada implementación antes de continuar
- **Documentación esencial**: Solo documentar lo que añade valor

---

## 📅 **IMPLEMENTACIÓN DEL FLUJO**

### **🔄 FASE ACTUAL: Gate C Completado**
- **Estado**: ✅ 100% completado
- **Próximo paso**: Validación conjunta de todos los gates
- **Siguiente fase**: Preparación para implementación técnica

### **📅 PRÓXIMOS PASOS:**
1. **Validar Gate C**: Confirmar funcionamiento del workflow CI
2. **Healthcheck completo**: Verificar estado general del proyecto
3. **Preparar siguiente fase**: Definir objetivos de implementación técnica

---

## 🎯 **CONCLUSIÓN**

Este flujo de trabajo implementa la **filosofía Toyota** de:
- **Coordinación efectiva** sin conflictos
- **Calidad asegurada** en cada gate
- **Mejora continua** del proceso
- **Simplicidad** en la implementación

**Resultado esperado**: Proyecto implementado con calidad, coordinación perfecta y mejora continua.
