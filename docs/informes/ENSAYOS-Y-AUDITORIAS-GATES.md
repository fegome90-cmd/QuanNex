# 🔬 Ensayos Controlados y Auditoría de Herramientas — Gates QuanNex

**Fecha:** 2025-01-27  
**Responsables principales:** Plataforma (Luis), TaskDB Core (Ana), Auditoría (Felipe), SecOps (María)

---

## 1. Objetivo

Diseñar experimentos controlados para validar el nuevo marco de gates antes del despliegue global y auditar las herramientas existentes que servirán como base (scripts husky, CLI, políticas).

---

## 2. Ensayo Piloto del Sistema de Gates

### 2.1 Equipo Piloto
- Seleccionar un squad mixto (3 dev TaskDB Core, 1 plataforma, 1 QA) que opere en una rama dedicada (`experiment/gates-piloto`).
- Duración del piloto: 10 días hábiles.

### 2.2 Alcance del Ensayo
1. Activar los hooks graduales solo en la rama piloto (simular `NODE_ENV=development`).
2. Instrumentar telemetría (`gates.failures.hourly`, `gates.bypass.manual`, `hook.false_positive.rate`) contra un entorno de Prometheus aislado.
3. Registrar todas las ejecuciones en el Gate Unlock Log piloto.

### 2.3 Métricas de Éxito del Ensayo
- 100% de bypasses documentados y revisados al día siguiente.
- Reducción observable de errores TS por commit (comparar contra baseline previa).
- Ningún despliegue bloqueado por falsos positivos sin remediación en <24h.
- Feedback cualitativo positivo del squad sobre claridad de reglas.

### 2.4 Retroalimentación
- Retrospectiva dedicada al final del piloto.
- Ajustar protocolo de presupuesto de errores y umbrales con base en la retro.

---

## 3. Auditoría de Herramientas Existentes

### 3.1 `workflow-enforcement.mjs`
- **Checklist:**
  - [ ] Revisar manejo de `process.env` (tolerancia a variables faltantes).
  - [ ] Verificar que pueda emitir logs JSON sin romper la tubería actual.
  - [ ] Confirmar compatibilidad con `NODE_ENV=development/staging/production`.
  - [ ] Documentar rutas de error para ambientes sin configuración MCP.
- **Riesgo:** script fue diseñado para producción; requiere safeguards para `dev`.

### 3.2 `policy-check.mjs`
- **Checklist:**
  - [ ] Validar que las promesas manejen timeouts; evitar bloqueos en pre-push.
  - [ ] Auditar dependencias y versiones; instalar las necesarias para el ensayo.
  - [ ] Confirmar que la nueva telemetría no expone datos sensibles.

### 3.3 `.husky/` scripts y `pre-push`
- **Checklist:**
  - [ ] Evaluar compatibilidad con bypass condicionados (`QUANNEX_BYPASS`).
  - [ ] Ensayar la degradación de checks en modo `development`.
  - [ ] Garantizar mensajes claros cuando el hook bloquea (incluir requestId).

### 3.4 `cli-reports.mjs`
- **Checklist:**
  - [ ] Habilitar exportación automática de resultados `npm run typecheck` a TaskDB.
  - [ ] Confirmar que el CLI maneje grandes volúmenes sin truncar la información.

### 3.5 Integraciones Prometheus/Grafana
- **Checklist:**
  - [ ] Configurar scrape jobs para los endpoints de datos generados por los hooks.
  - [ ] Validar panel básico de 7/14 días con data sintética.
  - [ ] Ensayar alertas con umbrales de prueba (incluir notificaciones).

---

## 4. Plan de Contingencia Durante el Piloto

| Escenario | Acción inmediata | Responsable |
| --- | --- | --- |
| Instrumentación cae | Cambiar a registro manual (spreadsheet) y abrir incidente | Plataforma |
| Falsos positivos masivos | Desactivar temporalmente checks MCP en dev, documentar | SecOps + Plataforma |
| Fatiga por warnings | Aplicar “sprint freeze” de nuevas funcionalidades; dedicar 1 día a saneamiento | Liderazgo Squad |
| Bypass sin justificación | Postmortem de 1 h + coaching obligatorio | Auditoría + Gate Steward |

---

## 5. Cronograma

| Hito | Fecha objetivo | Responsable |
| --- | --- | --- |
| Auditoría técnica completada | 2025-01-29 | Plataforma + Auditoría |
| Inicio del piloto | 2025-01-30 | Squad piloto |
| Retro piloto y ajustes | 2025-02-13 | Squad + Comité de Gates |
| Evaluación para despliegue global | 2025-02-15 | Comité de Gates |

---

## 6. Entregables Requeridos

1. Informe de auditoría técnica (`docs/informes/AUDITORIA-HERRAMIENTAS-GATES.md`).
2. Bitácora del piloto con métricas diarias y notas de incidentes.
3. Actualización del Protocolo de Presupuesto de Errores tras retro.
4. Recomendación formal de “go/no-go” para despliegue global.

---

**Notas:**  
- Ningún cambio de política se volverá permanente sin evidencias recopiladas en este piloto.  
- Auditoría acompañará cada día con un check-in de 15 minutos para resolver bloqueos.
