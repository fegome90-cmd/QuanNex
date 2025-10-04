# ✅ Plan de Soluciones Detallado — Riesgos Adicionales de Gates QuanNex

**Fecha:** 2025-01-27  
**Autor:** Equipo de Auditoría QuanNex

---

## 1. Plan de Rollback del Marco de Gates

### 1.1 Safe Mode
- Introducir variable `QUANNEX_GATES_SAFE_MODE=true` que deshabilite hooks graduales y reestablezca la configuración actual (pre-análisis) sin necesidad de revertir commits.
- Documentar procedimiento en `OPERATIONS_PLAYBOOK_COMPLETE.md` con comandos exactos.

### 1.2 Script de Reversión
- Crear script `scripts/gates/restore-legacy.sh` que:
  1. Restaure versiones previas de `.husky/pre-push`, `workflow-enforcement.mjs`, `policy-check.mjs`.
  2. Limpie tablas de telemetría parcial para evitar datos inconsistentes.

### 1.3 Criterios para Activación
- Activar safe mode si:
  - `gates.failures.hourly` supera el doble del umbral en dos ventanas consecutivas.
  - Prometheus o TaskDB fallan >2h.
  - Se detecta pérdida de commits por mal funcionamiento del hook.

---

## 2. Validación de Capacidad de Tooling

| Sistema | Acción | Responsable | Fecha |
| --- | --- | --- | --- |
| TaskDB | Stress test de escritura/lectura con telemetría simulada; definir límites de retención | TaskDB Core | 2025-01-30 |
| Prometheus | Verificar almacenamiento y replicación; estimar uso con 90 días de historial | Plataforma | 2025-02-01 |
| Grafana | Configurar dashboards con data sintética y validar permisos | Plataforma | 2025-02-02 |
| Alertmanager | Ensayar flujo de notificaciones (Slack/E-mail) y confirmar contactos | SecOps | 2025-02-02 |

---

## 3. Plan para Componentes Legacy

### 3.1 Inventario
- `core/taskdb/sqlite.ts`
- `cli-reports.mjs`
- Scripts adhoc en `core/scripts`

### 3.2 Estrategia
1. Clasificar componentes en categorías: **Refactor inmediato**, **Aislar con type stubs**, **Deprecación programada**.
2. Asignar owners por módulo y registrar en `docs/policies/ownership.md`.
3. Definir roadmap de refactor en tres iteraciones (4, 8, 12 semanas).

---

## 4. Gestión de Stakeholders de Negocio

- Establecer reunión quincenal con liderazgo de producto para compartir estado de madurez.
- Crear sección “Gate Readiness” en reportes ejecutivos.
- Mantener canal dedicado (#roadmap-readiness) con alertas de bloqueos y ETA de ADRs.

---

## 5. Revisión Legal/Compliance de Telemetría

1. Auditar campos recolectados (`requestId`, `justification`, etc.) con SecOps y Legal.
2. Implementar anonimización parcial (hash + truncado) para requestId; evitar almacenamiento de firmas completas.
3. Definir política de retención: 30 días para eventos crudos, 180 días para agregados.
4. Registrar decisiones en `docs/policies/data-handling.md`.

---

## 6. Prevención de Fatiga por Advertencias

- SLA propuesto: reconocer nueva advertencia en 24h, resolver o planificar en ≤3 días hábiles.
- Dashboards con contadores de advertencias por módulo; alerta cuando >20.
- Activar “Sprint Focus” (solo saneamiento) si dos sprints consecutivos exceden el presupuesto.
- Gate Steward coordina sesiones de pair-programming para reducir backlog de warnings.

---

## 7. Estrategia de Pruebas Automatizadas

### 7.1 Tipos de Prueba
- **Unitarias**: funciones de severidad y parsing de telemetría.
- **Integración**: ejecución de hooks en contenedor `dev` y `staging`, verificando rutas de bypass, logs y fallbacks.
- **Smoke**: pipeline CI dedicado (`gates-smoke`) que corre los hooks contra un repositorio sintético en cada cambio al framework.

### 7.2 Implementación
- Añadir carpeta `tests/gates/` con suites Jest/Node.
- Configurar GitHub Actions `gates-smoke.yml` para ejecutar pruebas en PRs que modifiquen `packages/quannex-mcp`, `.husky/`, `scripts/gates`.

---

## 8. Simulacros Trimestrales
- Definir calendario anual de Game Days (uno por trimestre).
- Escenarios sugeridos: incremento artificial de `gates_failures_hourly`, indisponibilidad del escáner externo, bypass simulado sin justificación.
- Evaluar tiempos de detección, comunicación y recuperación; alimentar postmortem.

---

## 9. Adopción de Patrones Observables
- Checklist obligatorio en cada ADR/proyecto nuevo.
- Revisión trimestral para asegurar cumplimiento; bloquear despliegues si no se documenta.
- Crear backlog de deuda de observabilidad para servicios existentes; priorizar remediación en ciclos trimestrales.

---

## 10. Catálogo de Dependencias Externas
- Mantener `docs/informes/CATALOGO-DEPENDENCIAS-GATES.md` actualizado.
- Revisar en cada Comité de Gates; ajustar comportamientos de degradación según experiencia.

---

## 8. Seguimiento Consolidado

| Actividad | Frecuencia | Entregable |
| --- | --- | --- |
| Comité de Gates | Semanal | Acta con métricas, decisiones y pendientes |
| Auditoría técnica | Diario durante el piloto | Nota breve en `ENSAYOS-Y-AUDITORIAS-GATES.md` |
| Revisión legal | Mensual hasta finalizar ajuste | Informe de cumplimiento |
| Pilot report | Al final del piloto | Recomendación de Go/No-Go |

---

**Nota:** Este documento complementa `PLAN-REACTIVACION-ROADMAP.md` y `ENSAYOS-Y-AUDITORIAS-GATES.md`; cualquier hallazgo o cambio debe reflejarse en los tres artefactos.
