# 📚 Contexto Integral del Proyecto QuanNex (Octubre 2025)

## 1. Problema Central: Parálisis del Desarrollo y Controles Rotos

El proyecto atraviesa un bloqueo sistémico en el desarrollo debido a una desconexión profunda entre el proceso iterativo y los mecanismos de control de calidad. Políticas rígidas pensadas para producción se aplican sin adaptación en entornos de desarrollo.

### Síntomas principales
- **Bloqueo total por errores menores:** Gates binarios (pasa/falla) impiden cualquier `git push` si se detecta un error, aun cuando sea un formato o tipo. `ANALISIS-ERRORES-GATES-DETALLADO.md` registra más de 30 errores TypeScript que detonan estos bloqueos.
- **Evasión sistemática y destructiva:**
  - Uso de `git push --no-verify`, saltándose controles e introduciendo riesgo.
  - Rollbacks masivos documentados en `INFORME-FINAL-FALLAS-GATES.md`, eliminando >125 000 líneas de código y destruyendo trabajo previo.
- **Falta de visibilidad:** No existía telemetría sobre fallos de gates, bypasses o tiempo perdido; `INFORME-METRICAS-GATES.md` destaca esta ceguera operativa.

## 2. Impacto: Congelamiento del Roadmap Estratégico

La parálisis bloquea los ADRs clave (RAGAS, DSPy, ColBERT) según `ROADMAP_RAG.md` y `MEMORIA-PROYECTO-RAG-ACTUALIZADA.md`. Aunque el plan operativo (`OPERATIONS_PLAYBOOK_COMPLETE.md`) es maduro, el ciclo diario de desarrollo carece de la misma robustez.

## 3. Solución Propuesta: Plan Integral de Reactivación

El plan aborda observabilidad, remediación técnica, cultura y antifragilidad:

### Capa 1 – Observabilidad
- Instrumentar logging y métricas (`gates.failures.hourly`, `gates.bypass.manual`, `ts.errors.blocking`).
- Crear dashboards Grafana y alertas Prometheus.

### Capa 2 – Remediación Técnica
- Ejecutar `PLAN-CORRECCION-TYPESCRIPT.md` para eliminar la deuda de >30 errores TS.

### Capa 3 – Proceso y Cultura
- Implementar hooks graduales por ambiente/severidad.
- Definir el “Protocolo de Presupuesto de Errores” y automatizar el Gate Unlock Log.
- Establecer roles y rituales (Comité de Gates, Gate Steward, reportes quincenales).

### Capa 4 – Antifragilidad
- Introducir Game Days trimestrales (
Simulacros de fallos).
- Aplicar “Modulación de Gobernanza” para reducir control cuando el sistema se estabilice.
- Publicar patrones `docs/architecture/patterns/observable-services.md` para prevenir nueva deuda.

## 4. Criterio de Éxito: Desbloqueo del Roadmap

Mantener durante 14 días consecutivos:
- `ts.errors.blocking` en 0 o tendencia descendente documentada.
- `gates.bypass.manual <= 1` y bypasses justificados.
- `gates.failures.hourly` dentro de umbrales.
- `hook.false_positive.rate <= 10%` con mitigación.
- Telemetría y dashboards sin lag >24h.
- Reporte semanal firmado por Plataforma, TaskDB Core y Auditoría.

Al cumplirse, la madurez pasa a “En Progreso” en `AUDITORIA-QUANNEX-INFORMES.md` y se levanta el bloqueo sobre los ADRs estratégicos.

---

**Este documento se mantiene como referencia viva; actualizar junto con el plan de reactivación y la auditoría.**
