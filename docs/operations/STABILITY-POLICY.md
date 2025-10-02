# Política de Estabilidad y Calidad (Toyota)

## Objetivo
- Evitar introducir fallas críticas mientras evolucionamos el kit.
- Priorizar robustez, validación preventiva, recuperación segura y medición.
- Aplicar los 14 principios Toyota para excelencia operacional.

## Fundamentos Toyota Aplicados

### Pilar 1: Just-in-Time (JIT)
- Activar features solo cuando están completamente validadas
- Eliminar over-engineering y funcionalidad innecesaria
- Pull-based system: siguiente fase solicita trabajo a la anterior

### Pilar 2: Jidoka (Automatización con Toque Humano)
- Detectar defectos automáticamente y parar la línea
- Fail-fast en validaciones críticas
- Human intervention para resolver problemas complejos

## Modos y Flags
- Estabilización: no se activan features arriesgadas por defecto.
- Templates: `--use-templates=off` por defecto (activar con `on` tras validar).
- Hooks: sin `--fix` por defecto; opt‑in con `CLAUDE_HOOKS_LINT_FIX=1`.
- MCP: habilitación controlada (estado y validaciones se integran en PR12).

## Gates (Stop/Go) - Principio Toyota "Pare para Arreglar"
- Gate A: Permisos/espacio + fallbacks visibles + cleanup seguro.
- Gate B: Templates validados (JSON/estructura/versión) + 0 placeholders.
- Gate C: MCP/Hooks resilientes (enable/disable razonado, ejecutables sin Node).
- Gate D: Transaccionalidad + healthcheck funcional por tipo.
- Gate E: Logs/errores estructurados + compatibilidad de templates.

## Guardrails - Principio Toyota "Poka-Yoke"
- Fail‑fast preflight: validar permisos, nombre y espacio antes de tocar disco.
- Concurrencia: lock por destino; staging temporal + move atómico; rollback seguro.
- Determinismo: tests sin red/externos; edge cases cubiertos.
- Defaults seguros: configuración conservadora por defecto.

## Testing y CI - Principio Toyota "Estandarización"
- Required checks: lint, init, flags, unit, secret scan, edge.
- Artifacts: `reports/init-report.json` y `reports/validation.json`.
- Visual management: estados claros (✅⏳❌) en todos los outputs.

## Release y Recuperación - Principio Toyota "Respeto por las Personas"
- RCs antes de estable; backup/rollback opt‑in.
- Guías de recuperación y `rutina de restauración (pendiente)`.
- Documentación clara para troubleshooting.

## Comunicación - Principio Toyota "Control Visual"
- Mensajes claros de éxito/fallo y recomendaciones; logs persistentes con contexto.
- Status dashboards y progress tracking visible.
- Andon (alertas) inmediatas cuando hay problemas.

## Herramientas Toyota Implementadas

### 5 Por Qués (Root Cause Analysis)
- Aplicar sistemáticamente cuando hay fallos
- Documentar en post-mortems para learning organizacional
- No quedarse en síntomas, ir hasta la causa raíz

### Gemba Walk (Ir al Lugar Real)
- Testing en entorno real del usuario (Mac)
- Validación con casos de uso reales, no sintéticos
- Feedback directo del usuario como fuente de verdad

### Kaizen (Mejora Continua)
- Retrospectivas semanales obligatorias
- Políticas que evolucionan basadas en learnings
- Cada fallo es oportunidad de mejora sistemática

### Nemawashi (Consenso antes de Decisión)
- RFCs para decisiones arquitecturales importantes
- Gates que requieren validación exhaustiva antes de proceder
- Implementación rápida una vez que hay consenso

## Métricas Toyota para Software

### Flow Metrics
- Lead Time: tiempo desde idea hasta deployment
- Cycle Time: tiempo desde start hasta finish  
- Work in Progress: limitado por capacidad real
- Throughput: PRs completados por período

### Quality Metrics  
- Defect Rate: fallos por feature released
- First Time Right: % trabajo que no necesita rework
- Customer Satisfaction: feedback score del usuario
- Technical Debt: ratio maintenance vs new features

### People Metrics
- Skill Development: growth en capabilities técnicas
- Problem Solving: efectividad en resolución de issues
- Continuous Improvement: número de kaizen implementados
- Knowledge Sharing: cross-training effectiveness

## Kata Toyota - Mejora Científica

### 1. Entender Dirección/Visión
- Visión: Kit robusto para project optimization personal
- Challenge: Subir tasa de éxito del 5% al 95%

### 2. Condición Actual  
- Medición objetiva del estado presente
- Identificación de obstacles específicos
- Baseline metrics establecidas

### 3. Próxima Condición Objetivo
- Target específico y medible
- Timeline definido y realista  
- Success criteria claros

### 4. Experimentos hacia Objetivo
- Hipótesis específicas a probar
- Métodos de medición definidos
- Learning capture para siguiente iteración

## Principios de No Negociables

1. **Calidad primero, velocidad segundo** - Nunca sacrificar calidad por speed
2. **Para la línea cuando hay defectos** - Gates estrictos sin excepciones  
3. **Ve y ve por ti mismo** - Testing real, no asunciones
4. **Mejora continua es responsabilidad de todos** - No solo del "owner"
5. **Respeta las personas desarrollando su potencial** - Foco en crecimiento personal

## Aplicación Inmediata

### Próximo Experiment (Toyota Kata)
- **Hipótesis**: Si implementamos PR7-PR9, entonces mejoramos estabilidad del sistema
- **Target**: 90%+ success rate en scenarios reales  
- **Medición**: Tests passing, healthcheck results, user feedback
- **Timeline**: 1 semana por PR con validación exhaustiva

### Definition of Done (Toyota Standard)
- [ ] Todos los tests pasan (lint, init, flags, unit, secret scan)
- [ ] Healthcheck OK en entorno real  
- [ ] Documentation actualizada
- [ ] Post-mortem de learnings documentado
- [ ] Metrics capturadas para próximo ciclo

**Toyota Way aplicado: "Excelencia operacional a través de people development y continuous improvement"** 🚗✨
