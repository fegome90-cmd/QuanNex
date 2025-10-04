# 📈 Informe de Métricas Operativas de Gates QuanNex

**Fecha**: 2025-01-27  
**Responsable**: Equipo de Auditoría QuanNex (Felipe)

## 🎯 Objetivo

Consolidar la telemetría mínima necesaria para evaluar la efectividad y la resiliencia de los gates de seguridad y hooks pre-push de QuanNex. Este informe se convierte en la fuente de verdad cuantitativa que respalda los análisis cualitativos existentes.

---

## 🧮 Métricas Críticas

| Métrica | Descripción | Fuente | Frecuencia | Responsable | Estado |
| --- | --- | --- | --- | --- | --- |
| `gates.failures.hourly` | Número de fallas de hooks/gates por hora (dev/staging/prod) | `packages/quannex-mcp/workflow-enforcement.mjs` + logs Husky | Cada 60 min | SRE QuanNex | 🔴 Instrumentar |
| `gates.bypass.manual` | Conteo de ejecuciones con `--no-verify` o bypass autorizado | TaskDB audit trail | Cada push | Equipo Plataforma | 🟠 Diseño en curso |
| `ts.errors.blocking` | Errores TypeScript que bloquean push (por categoría TS5097, TS1484, etc.) | `cli-reports.mjs` + `npm run typecheck` output almacenado | Diario | TaskDB Core | 🟠 Diseño en curso |
| `rollback.lines.deleted` | Líneas eliminadas por ramas de rollback masivo | TaskDB git analytics | Post-incident | Auditoría | 🟠 Diseño en curso |
| `unlock.mttd` | Tiempo medio desde bloqueo hasta mitigación documentada | Registro en `OPERATIONS_PLAYBOOK.md` | Mensual | Operaciones | 🔴 Instrumentar |
| `bypass.alerts.triggered` | Alertas emitidas por uso de bypass por encima de umbral | Alertmanager + `policy-check.mjs` | Cada evento | SecOps | 🔴 Instrumentar |

> Estado legend: 🔴 No instrumentado, 🟠 Diseño en curso, 🟢 En producción.

---

## 🔍 Propósito de Cada Métrica

- **Detección temprana de regresiones**: Los spikes en `gates.failures.hourly` activan análisis inmediato antes de que escale a rollbacks.
- **Gobernanza de bypasses**: `gates.bypass.manual` y `bypass.alerts.triggered` aseguran que las rutas de escape no se vuelvan el camino principal.
- **Seguimiento de deuda técnica**: `ts.errors.blocking` muestra la efectividad del plan de corrección TypeScript y evidencia tendencias por módulo.
- **Costos de rollback**: `rollback.lines.deleted` cuantifica el impacto destructivo y alimenta el termómetro operativo en `INFORME-FINAL-FALLAS-GATES.md`.
- **Madurez operacional**: `unlock.mttd` refleja la capacidad antifrágil del equipo para recuperarse sin improvisar.

---

## 🛠️ Plan de Instrumentación

1. **Logs estructurados en hooks** (responsable: Plataforma)  
   - Añadir emisión JSON en `workflow-enforcement.mjs` y `policy-check.mjs` con ambiente, tipo de fallo y requestId.  
   - Persistir en TaskDB (tabla `gate_events`) con TTL de 90 días.

2. **Auditoría de bypasses** (responsable: SRE)  
   - Registrar ejecuciones de `git push --no-verify` mediante hook wrapper.  
   - Enviar métrica a Prometheus (`gates_bypass_total`) y activar alerta cuando supere 2 eventos en 24 h por equipo.

3. **Captura automática de reportes TypeScript** (responsable: TaskDB Core)  
   - Integrar `cli-reports.mjs` para almacenar salida de `npm run typecheck -- --pretty false` en TaskDB.  
   - Etiquetar cada error con rama y commit.

4. **Análisis de repositorio** (responsable: Auditoría)  
   - Ejecutar tarea semanal que calcule `rollback.lines.deleted` con `git log --stat` filtrando ramas `autofix/*` y `fix-pack/*`.  
   - Publicar resumen en `INFORME-FINAL-FALLAS-GATES.md`.

5. **Registro de desbloqueos** (responsable: Operaciones)  
   - Actualizar runbooks para que cada mitigación incluya tiempo de inicio/fin y responsable.  
   - Volcar datos en tabla `gate_unlocks` o en `OPERATIONS_PLAYBOOK.md` con formato estandarizado.

---

## 📊 Tablero de Referencia

| Indicador | Umbral | Acción | Dueño |
| --- | --- | --- | --- |
| `gates.failures.hourly` > 5 (dev) | Revisar configuraciones y PR recientes | Plataforma |
| `gates.bypass.manual` > 1 en 24 h | Revisar justificación; activar mentoring | SecOps |
| `ts.errors.blocking` sin tendencia a la baja en 3 iteraciones | Escalar a dirección técnica | TaskDB Core |
| `rollback.lines.deleted` > 1k en semana | Congelar ramas afectadas, abrir postmortem | Auditoría |
| `unlock.mttd` > 6 h | Revisar runbooks y staffing | Operaciones |

---

## 🧭 Integración con Otros Informes

- Alimenta el **Termómetro Operativo** y la **Matriz de Riesgo** (`INFORME-FINAL-FALLAS-GATES.md`).
- Sirve como base para la tabla “Estado esperado tras mitigación” (`ANALISIS-ERRORES-GATES-DETALLADO.md`).
- Provee datos para la rúbrica de madurez en `AUDITORIA-QUANNEX-INFORMES.md`.
- Actualiza el semáforo de avance en `MEMORIA-PROYECTO-RAG-ACTUALIZADA.md` y `ROADMAP_RAG.md`.

---

## 📌 Próximos Pasos

1. Aprobar plan de instrumentación y asignar responsables.
2. Registrar las primeras series de datos base (mínimo 7 días) antes de modificar gates.
3. Revisar semanalmente y actualizar este informe con cambios de estado o nuevos umbrales.

---

**Estado**: 🚧 Instrumentación en progreso (requiere aprobación de plataforma y SecOps).  
**Última revisión**: 2025-01-27 – Felipe, Auditoría QuanNex.
