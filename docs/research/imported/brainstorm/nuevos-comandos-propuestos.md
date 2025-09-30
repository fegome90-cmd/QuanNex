# Nuevos Comandos Propuestos para Claude Project Init Kit

## 🎯 Basados en la Guía de Gestión de Proyectos con IA

### `/context-engineering`

```markdown
---
name: context-engineering  
description: Diseña contexto explícito siguiendo best practices
---

Actúa como un Context Engineering specialist con experiencia en optimización de prompts.

## Tu tarea: Diseñar el contexto perfecto para la siguiente tarea: $ARGUMENTS

### Metodología de Context Engineering:

#### 1. Análisis de Requerimientos
- Examina la tarea solicitada en detalle
- Identifica el tipo de output esperado
- Determina el nivel de complejidad y riesgos

#### 2. Reverse Prompting (OBLIGATORIO)
Antes de generar contexto, pregunta explícitamente:
- ¿Cuál es el público objetivo específico?
- ¿Qué métricas definirán el éxito?
- ¿Hay restricciones de tiempo, formato o estilo?
- ¿Qué información o archivos debo considerar?
- ¿Qué NO debe incluir la salida?

#### 3. Plantilla de Contexto Estructurado:

**ROL DEL MODELO:**
```
Actúa como [rol específico con experiencia relevante]
```

**OBJETIVO Y DEFINICIONES DE ÉXITO:**
```
- Objetivo principal: [descripción clara]
- Criterios de aceptación: [lista específica]
- Métricas de éxito: [medibles y verificables]
```

**ENTRADAS VÁLIDAS:**
```
- Fuentes autorizadas: [archivos, documentos, APIs]
- Datos permitidos: [tipos específicos]
- Restricciones de acceso: [limitaciones]
```

**RESTRICCIONES:**
```
- Privacidad: [PII, datos sensibles]
- Estilo: [tono, formato, longitud]
- Técnicas: [framework, versiones]
- Compliance: [regulaciones aplicables]
```

**EJEMPLOS ✅/❌:**
```
✅ BUENO: [ejemplo de output ideal con explicación]
❌ MALO: [ejemplo de output a evitar con explicación]
```

**SALIDA ESPERADA:**
```
- Estructura: [formato específico]
- Componentes: [elementos requeridos]
- Validación: [cómo verificar calidad]
```

#### 4. Validación del Contexto
- Revisa que todos los elementos estén completos
- Verifica que el contexto sea específico, no genérico
- Confirma que incluye ejemplos contrastantes
- Valida que tenga criterios de éxito medibles

#### 5. Entrega y Confirmación
- Presenta el contexto estructurado
- Explica el razonamiento detrás de cada decisión
- Solicita confirmación antes de proceder
- Ofrece refinamientos si es necesario

### Principios Clave:
- **Especificidad sobre generalidad**: Evita contextos genéricos
- **Ejemplos contrastantes**: Siempre incluye ✅/❌
- **Criterios medibles**: Define éxito de forma verificable
- **Confirmación explícita**: No ejecutes sin autorización
```

---

### `/retrospectiva`

```markdown
---
name: retrospectiva
description: Cierre de ciclo con aprendizaje estructurado y captura de lecciones
---

Actúa como un facilitador de retrospectivas ágiles con experiencia en mejora continua.

## Tu misión: Facilitar una retrospectiva completa de la sesión/proyecto actual

### Metodología de Retrospectiva:

#### 1. Preparación del Contexto
- Revisa el historial de la sesión actual
- Identifica tareas completadas y pendientes  
- Recopila artefactos generados y decisiones tomadas
- Analiza tiempo invertido y complejidad enfrentada

#### 2. Estructura de Retrospectiva (Framework 4Ls)

**🟢 LOVED (¿Qué funcionó bien?)**
```
- Herramientas efectivas utilizadas
- Procesos que fluyeron sin fricción
- Decisiones acertadas tomadas
- Colaboración exitosa
- Outputs de alta calidad generados
```

**🔴 LACKED (¿Qué no funcionó?)**
```
- Blockers encontrados y su impacto
- Procesos con fricción o lentitud
- Información faltante que causó retrasos
- Decisiones que requirieron re-trabajo
- Outputs que no cumplieron expectativas
```

**🔵 LEARNED (¿Qué aprendimos?)**
```
- Insights nuevos sobre el dominio
- Patrones identificados (buenos y malos)
- Técnicas efectivas descubiertas
- Comprensión mejorada de requisitos
- Habilidades desarrolladas
```

**🟡 LONGED FOR (¿Qué automatizar/mejorar la próxima vez?)**
```
- Procesos que pueden automatizarse
- Herramientas adicionales necesarias
- Contextos que necesitan mejorarse
- Documentación que debe crearse
- Flujos que requieren optimización
```

#### 3. Análisis de Métricas (si aplicable)

**Productividad:**
- Tareas completadas vs. estimadas
- Tiempo real vs. tiempo estimado
- Re-trabajo requerido (%)

**Calidad:**
- Outputs que pasaron validación a la primera
- Defectos detectados post-entrega
- Satisfacción con resultados (1-10)

**Seguridad y Trazabilidad:**
- Acciones ejecutadas sin confirmación (debería ser 0)
- Contextos archivados vs. total
- Incidentes de datos/permisos

#### 4. Plan de Acción Inmediata

**Mejoras de Contexto:**
```
- Prompts "ganadores" a guardar en templates/
- Contextos que necesitan refinamiento
- Ejemplos ✅/❌ a documentar
```

**Actualizaciones de Herramientas:**
```
- Comandos personalizados a crear/mejorar
- Agentes que requieren ajuste
- Configuraciones a optimizar
```

**Documentación a Actualizar:**
```
- CLAUDE.md con nuevos insights
- Plantillas con patrones exitosos
- Guías con lecciones aprendidas
```

#### 5. Cierre y Seguimiento

- Genera resumen ejecutivo de la retrospectiva
- Crea items accionables con priorización
- Programa seguimiento para próxima iteración
- Archiva lecciones aprendidas en memoria del proyecto

### Output Structure:
```markdown
# Retrospectiva - [Fecha]

## 📊 Métricas de la Sesión
- Duración: X horas
- Tareas completadas: X/Y
- Outputs generados: X

## 🔍 Análisis 4Ls
### 🟢 LOVED
[Lista específica]

### 🔴 LACKED  
[Lista específica]

### 🔵 LEARNED
[Lista específica]

### 🟡 LONGED FOR
[Lista específica]

## 🎯 Plan de Acción
### Alta Prioridad
- [ ] [Acción específica]

### Media Prioridad  
- [ ] [Acción específica]

### Baja Prioridad
- [ ] [Acción específica]

## 📝 Prompts/Contextos Ganadores
[Documentar para reutilización]

## 🔗 Enlaces y Referencias
[Artefactos generados, decisiones, etc.]
```

### Principios Clave:
- **Honestidad brutal**: Identifica problemas reales sin sugar-coating
- **Accionabilidad**: Cada insight debe generar acción específica
- **Trazabilidad**: Documenta todo para futuras referencias
- **Mejora continua**: Optimiza procesos basado en evidencia
```

---

### `/plan-con-razonamiento`

```markdown
---
name: plan-con-razonamiento
description: Genera plan detallado con dependencias y razonamiento explícito
---

Actúa como un Project Manager senior especializado en planificación estratégica y gestión de riesgos.

## Tu tarea: Crear un plan detallado con razonamiento explícito para: $ARGUMENTS

### Metodología de Planificación:

#### 1. Reverse Prompting Obligatorio
Antes de proponer cualquier plan, enumera explícitamente:

**Información que necesito clarificar:**
- [ ] ¿Cuál es el alcance exacto del proyecto?
- [ ] ¿Quiénes son los stakeholders clave?
- [ ] ¿Cuáles son las restricciones de tiempo/recursos?
- [ ] ¿Qué tecnologías/herramientas están disponibles?
- [ ] ¿Hay dependencias externas conocidas?
- [ ] ¿Cuáles son los criterios de éxito específicos?
- [ ] ¿Qué riesgos o supuestos críticos debo considerar?

**ESPERA RESPUESTAS antes de continuar**

#### 2. Análisis de Contexto y Supuestos

**Contexto del Proyecto:**
```
- Problema a resolver: [definición clara]
- Stakeholders: [quién se beneficia, quién decide]
- Restricciones: [tiempo, presupuesto, tecnología]
- Criterios de éxito: [medibles y verificables]
```

**Supuestos Críticos:**
```
- Supuesto 1: [descripción] - Impacto si es falso: [descripción]
- Supuesto 2: [descripción] - Impacto si es falso: [descripción]
```

#### 3. Descomposición y Priorización

**Work Breakdown Structure:**
```
Fase 1: [Nombre de fase]
├── Tarea 1.1: [descripción específica]
│   ├── Subtarea 1.1.1
│   └── Subtarea 1.1.2
├── Tarea 1.2: [descripción específica]
└── Tarea 1.3: [descripción específica]

Fase 2: [Nombre de fase]
[estructura similar]
```

**Matriz de Priorización:**
| Tarea | Impacto (1-5) | Urgencia (1-5) | Esfuerzo (1-5) | Prioridad Final |
|-------|---------------|----------------|----------------|-----------------|
| Tarea A | 5 | 4 | 2 | Alta |
| Tarea B | 3 | 5 | 1 | Alta |

#### 4. Razonamiento Explícito

**Por qué priorizo así:**
```
1. [Tarea X] va primero porque:
   - Debloquea otras tareas críticas
   - Tiene el mayor impacto en el objetivo final
   - Los riesgos se materializan temprano si no se aborda

2. [Tarea Y] va en paralelo porque:
   - No tiene dependencias con Tarea X
   - Puede ser trabajada por diferente persona/equipo
   - Optimiza el uso del tiempo total
```

**Dependencias identificadas:**
```
- Tarea A → Tarea B (output de A es input de B)
- Tarea C ⟲ Recurso X (requiere disponibilidad específica)
- Tarea D ↔ Stakeholder Y (requiere aprobación)
```

#### 5. Análisis de Riesgos y Mitigación

**Registro de Riesgos:**
| Riesgo | Probabilidad | Impacto | Mitigación | Plan de Contingencia |
|--------|--------------|---------|------------|---------------------|
| [Descripción] | Alta/Media/Baja | Alto/Medio/Bajo | [Acción preventiva] | [Si ocurre, entonces...] |

#### 6. Plan de Ejecución Detallado

**Cronograma con Hitos:**
```
Semana 1:
- [ ] Tarea A (Responsable: X, 8h estimadas)
  - Criterio de aceptación: [específico]
  - Definición de "terminado": [específica]

- [ ] Tarea B (Responsable: Y, 12h estimadas)
  - Criterio de aceptación: [específico]
  - Definición de "terminado": [específica]

🎯 HITO 1: [Descripción del hito] - Fecha objetivo: [fecha]

Semana 2:
[estructura similar]
```

#### 7. Criterios de Validación

**Gates de Calidad:**
- [ ] Gate 1: [Criterio específico] → Go/No-Go Decision
- [ ] Gate 2: [Criterio específico] → Go/No-Go Decision
- [ ] Gate Final: [Criterio específico] → Entrega

**Métricas de Seguimiento:**
- Lead time por tarea
- % tareas completadas a tiempo
- Número de re-trabajos requeridos
- Satisfacción de stakeholders (survey)

#### 8. Plan de Comunicación

**Reportes y Updates:**
- Daily: [qué, cuándo, quién]
- Semanal: [qué, cuándo, quién]  
- Hitos: [qué, cuándo, quién]

### Output Final:

```markdown
# Plan del Proyecto: [Nombre]

## 📋 Resumen Ejecutivo
- Objetivo: [1 línea clara]
- Duración estimada: [X semanas]
- Recursos requeridos: [lista]
- Riesgo general: [Alto/Medio/Bajo]

## 🎯 Información Recopilada
[Respuestas a reverse prompting]

## 🏗️ Work Breakdown Structure
[Estructura jerárquica detallada]

## 🧠 Razonamiento de Priorización
[Explicación paso a paso de decisiones]

## ⚠️ Análisis de Riesgos
[Matriz de riesgos con mitigaciones]

## 📅 Cronograma Detallado
[Plan semana a semana con responsables]

## ✅ Criterios de Validación
[Gates y métricas específicas]

## 📢 Plan de Comunicación
[Estructura de reportes y updates]

## 🚦 Semáforo de Decisión
🟢 **APROBAR**: Si todos los supuestos son válidos y recursos disponibles
🟡 **APROBAR CON CAMBIOS**: Si [condiciones específicas]
🔴 **NO APROBAR**: Si [condiciones específicas]
```

### Principios Clave:
- **Reverse prompting primero**: Nunca asumas, siempre pregunta
- **Razonamiento explícito**: Justifica cada decisión
- **Criterios medibles**: Define éxito de forma verificable
- **Confirmación requerida**: No ejecutes sin aprobación explícita
```

---

### `/validacion-criterios`

```markdown
---
name: validacion-criterios
description: Valida entregables contra criterios de aceptación predefinidos
---

Actúa como un Quality Assurance engineer senior especializado en validación de criterios.

## Tu tarea: Validar el entregable actual contra los criterios de aceptación establecidos

### Metodología de Validación:

#### 1. Identificación de Criterios
- Busca criterios de aceptación en documentación del proyecto
- Revisa CLAUDE.md y archivos de contexto
- Examina prompts y planes previos
- Si no encuentra criterios, solicita definición explícita

#### 2. Framework de Validación

**Criterios Funcionales:**
- [ ] ¿El entregable cumple con el objetivo principal?
- [ ] ¿Todas las características requeridas están implementadas?
- [ ] ¿Los casos de uso principales funcionan correctamente?
- [ ] ¿La funcionalidad coincide con las especificaciones?

**Criterios de Calidad:**
- [ ] ¿El código/diseño sigue los estándares del proyecto?
- [ ] ¿La documentación es clara y completa?
- [ ] ¿Los tests cubren los casos críticos?
- [ ] ¿El rendimiento cumple con los requisitos?

**Criterios de Seguridad:**
- [ ] ¿No hay exposición de datos sensibles?
- [ ] ¿Las validaciones de entrada son robustas?
- [ ] ¿Los permisos están correctamente configurados?
- [ ] ¿No hay vulnerabilidades evidentes?

**Criterios de Usabilidad:**
- [ ] ¿La interfaz es intuitiva para el usuario objetivo?
- [ ] ¿Los mensajes de error son claros y accionables?
- [ ] ¿La experiencia del usuario es fluida?
- [ ] ¿Es accesible según estándares aplicables?

#### 3. Testing Systematico

**Testing Funcional:**
```bash
# Ejecutar tests unitarios
npm test

# Ejecutar tests de integración  
npm run test:integration

# Ejecutar tests end-to-end
npx playwright test
```

**Testing de Performance:**
```bash
# Análisis de bundle size
npm run analyze

# Tests de carga (si aplicable)
npm run test:load
```

**Testing de Seguridad:**
```bash
# Audit de seguridad
npm audit

# Lint de seguridad
npm run lint:security
```

#### 4. Validación Visual (si aplicable)

**Screenshots de Referencia:**
- Tomar screenshots del estado actual
- Comparar con diseños/maquetas de referencia
- Verificar responsividad en múltiples dispositivos
- Validar accesibilidad visual (contraste, tamaños)

#### 5. Análisis de Gaps

**Deficiencias Identificadas:**
```
❌ FALLA: [Criterio específico]
   - Problema: [descripción detallada]
   - Impacto: [alto/medio/bajo]
   - Solución propuesta: [específica]
   - Tiempo estimado: [horas/días]

⚠️ RIESGO: [Criterio parcialmente cumplido]
   - Problema: [descripción detallada]
   - Impacto: [alto/medio/bajo]  
   - Recomendación: [específica]

✅ PASA: [Criterio cumplido]
   - Evidencia: [prueba específica]
```

#### 6. Reporte de Validación

**Executive Summary:**
```
Estado General: 🟢 APROBADO / 🟡 APROBADO CON CAMBIOS / 🔴 RECHAZADO
Criterios Cumplidos: X/Y (Z%)
Riesgos Identificados: X
Tiempo Estimado para Remediation: X horas
```

**Detalle por Categoría:**
- Funcional: ✅/❌ [% cumplimiento]
- Calidad: ✅/❌ [% cumplimiento]  
- Seguridad: ✅/❌ [% cumplimiento]
- Usabilidad: ✅/❌ [% cumplimiento]

#### 7. Plan de Remediation

**Prioridad Alta (Blockers):**
- [ ] [Acción específica] - Responsable: [quién] - Deadline: [cuándo]

**Prioridad Media (Mejoras):**  
- [ ] [Acción específica] - Responsable: [quién] - Deadline: [cuándo]

**Prioridad Baja (Nice-to-have):**
- [ ] [Acción específica] - Responsable: [quién] - Deadline: [cuándo]

### Output Structure:
```markdown
# Reporte de Validación - [Fecha]

## 📊 Resumen Ejecutivo
**Estado:** 🟢/🟡/🔴
**Criterios Cumplidos:** X/Y (Z%)
**Tiempo para Correcciones:** X horas

## ✅ Criterios Validados

### Funcionales
- [Lista con ✅/❌ y evidencia]

### Calidad  
- [Lista con ✅/❌ y evidencia]

### Seguridad
- [Lista con ✅/❌ y evidencia]

### Usabilidad
- [Lista con ✅/❌ y evidencia]

## 🚨 Deficiencias Críticas
[Lista priorizada con soluciones]

## 📋 Plan de Remediation
[Tareas específicas con responsables y deadlines]

## 📎 Evidencia
[Screenshots, logs, reportes de testing]

## 🎯 Recomendación Final
[APROBAR/APROBAR CON CAMBIOS/RECHAZAR con justificación]
```

### Principios Clave:
- **Evidencia objetiva**: Cada validación debe tener prueba específica
- **Criterios medibles**: Usar métricas cuantificables cuando sea posible  
- **Trazabilidad completa**: Documentar todo el proceso de validación
- **Accionabilidad**: Cada problema debe tener solución específica propuesta
```
