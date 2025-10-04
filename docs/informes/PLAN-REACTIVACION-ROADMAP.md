# 🛠️ Plan Integral para Reactivar el Roadmap Estratégico QuanNex

**Fecha:** 2025-01-27  
**Responsable:** Comité de Auditoría QuanNex (Felipe)

---

## 🎯 Objetivo

Establecer los pasos técnicos, operativos y culturales necesarios para elevar la madurez de los gates y del proceso de desarrollo hasta un nivel que permita desbloquear los ADRs estratégicos (RAGAS, DSPy, ColBERT) y reactivar el roadmap.

---

## 1. Telemetría y Observabilidad de Gates

### 1.1 Instrumentación Obligator ia
- Implementar logging estructurado en `workflow-enforcement.mjs` y `policy-check.mjs` con campos: `timestamp`, `env`, `requestId`, `outcome`, `severity`, `warnings`, `bypass`, `justification`.
- Crear tablas en TaskDB: `gate_events` (registro de cada ejecución), `gate_unlocks` (desbloqueos documentados).
- Exponer métricas a Prometheus:
  - `gates_failures_hourly{env=...}`
  - `gates_bypass_manual_total`
  - `gates_false_positive_total`
- Configurar alertas en Alertmanager para:
  - `gates_failures_hourly > 5` (dev), `> 2` (staging), `> 1` (prod)
  - `gates_bypass_manual_total > 1` en 24 horas
  - `gates_false_positive_rate > 0.1`

### 1.2 Dashboards y Rituales
- Crear panel en Grafana con series de 7/14 días para cada métrica.
- Incluir revisión de métricas en retro semanal (obligatoria) y comité técnico (quincenal).
- Responsable de presentar datos: Líder de Plataforma (rotativo).

---

## 2. Remediación Técnica de TypeScript

### 2.1 Ejecución del Plan
- Completar Fases 1-3 de `PLAN-CORRECCION-TYPESCRIPT.md` con responsables asignados (TaskDB Core, Plataforma, QA).
- Usar checklist QA (incluido en `ANALISIS-ERRORES-GATES-DETALLADO.md`) y adjuntar reporte firmado a la auditoría.

### 2.2 Validación Continua
- Configurar pipeline CI para publicar `ts.errors.blocking` en TaskDB tras cada `npm run typecheck`.
- Condicionar merge/push a mantener tendencia a cero en 14 días consecutivos.

---

## 3. Hooks Graduales y Contrato Social

### 3.1 Implementación Técnica
- Desplegar el sistema de severidad y detección de ambientes definidos en `ANALISIS-HOOKS-PRE-PUSH.md`.
- Documentar en README de hooks la diferencia de checks entre `dev`, `staging`, `prod`.

### 3.2 Protocolo de Presupuesto de Errores
- Crear documento `docs/policies/presupuesto-errores.md` con:
  - Límites de warnings por módulo/componente.
  - Procedimiento de saneamiento obligatorio (turno máximo 48h para reducir warnings).
  - Reglas para `QUANNEX_BYPASS`: quién puede activarlo, cuánto dura, qué justificación requiere, cómo se documenta.

### 3.3 Gate Unlock Log
- Integrar plantilla de registro en `OPERATIONS_PLAYBOOK_COMPLETE.md` y automatizar llenado vía script (pre-push o CLI) tras cada bypass.
- Revisar el log en la daily gestión (5 minutos dedicados).
- Referenciar el runbook `ops/runbooks/gates_safe_mode.md` para activación de emergencias.

---

## 4. Cultura y Procesos

### 4.1 Entrenamiento y Comunicación
- Sesión obligatoria para todo el equipo: explicar gates graduales, telemetría y expectativas de comportamiento.
- Actualizar `PULL_REQUEST_TEMPLATE.md` para incluir sección “Impacto en Gates / Telemetría”.
- Publicar resumen semanal de métricas y lecciones en canal interno (#gates-watch).

### 4.2 Mentoring y Accountability
- Nombrar “Gate Steward” rotativo por sprint encargado de vigilar el presupuesto de errores y reportar incidentes.
- Establecer política de “postmortem liviano” (máx. 1 h) para cada bypass no justificado o repetido.
- Incluir revisión del patrón `docs/architecture/patterns/observable-services.md` en cada ADR o diseño de servicio nuevo.

---

## 5. Criterios de Salida (Nivel “En Progreso”)

Se considerará exitosa la fase de reactivación cuando, durante **14 días consecutivos**:

- `ts.errors.blocking = 0` (o tendencia descendente con evidencia de corrección en curso documentada).
- `gates.bypass.manual <= 1` y todos los bypass registrados con justificación completa y revisión en Gate Unlock Log.
- `gates.failures.hourly` dentro de los umbrales definidos por ambiente.
- `hook.false_positive.rate <= 10%` y plan de mitigación documentado para cualquier excedente.
- Telemetría y dashboards funcionando sin lag >24h.
- Reporte semanal consolidado enviado a dirección técnica con firmas de Plataforma, TaskDB Core y Auditoría.

Una vez cumplidos, la rúbrica de madurez (`AUDITORIA-QUANNEX-INFORMES.md`) se actualiza a “En Progreso” y se levanta el bloqueo de ADRs (RAGAS, DSPy, ColBERT).

---

## 6. Seguimiento y Gobernanza

- **Comité de Gates**: Reunión semanal (Plataforma, TaskDB Core, Auditoría, SecOps). Revisar métricas, incidentes y acciones correctivas.
- **Reporte Mensual**: Auditoría entrega informe a stakeholders con estado de madurez, incidentes y recomendaciones.
- **Revisión Trimestral**: Validar si los gates pueden avanzar a “Controlado” (según rúbrica) y ajustar umbrales.
- **Modulación de Gobernanza**: Si los criterios de salida se mantienen durante dos trimestres consecutivos, reducir la frecuencia del Comité de Gates a mensual y suspender el rol de Gate Steward (quedará latente). Reactivar automáticamente si cualquier métrica clave cae 15% por debajo del baseline o si se registran más de dos bypasses sin justificación en un trimestre.
- **Presupuesto de Gobernanza**: El Comité de Gates debe medir y reportar cada trimestre el tiempo invertido en rituales; identificar oportunidades de simplificación cuando el costo supere 5% de la capacidad del equipo.
- **Simulacros Trimestrales (Game Days)**: Ejecutar ejercicios controlados que degraden métricas clave o simulen bypasses para validar alertas, comunicación y tiempos de respuesta incluso en períodos de baja intensidad; declarar fallo si MTTR > 15 minutos o si la respuesta se desvía del runbook, activando plan de acción correctiva antes del siguiente ejercicio.

---

## 7. Riesgos y Planes de Contingencia

| Riesgo | Mitigación |
| --- | --- |

| Persistencia de `--no-verify` | Alertas + revisión diaria del Gate Unlock Log; mentoring obligatorio. |
| Métricas incompletas | Automatizar auditorías de datos; fallback manual semanal mientras se estabiliza la recolección. |
| Sobrecarga de equipo | Distribuir responsabilidades (Gate Steward rotativo); incorporar KPIs de gates en evaluaciones. |
| Falsos positivos elevados | Revisar configuración MCP y TypeScript; permitir degradación temporal documentada en dev. |
| Fallo de la infraestructura de telemetría | Plan de rollback para hooks graduales: variable `QUANNEX_GATES_SAFE_MODE` que restablece configuración actual; respaldo diario de TaskDB y Prometheus; operación documentada en `OPERATIONS_PLAYBOOK_COMPLETE.md`. |
| Sesgo por métricas (equipos evitando cambios complejos) | Revisión bisemanal del backlog por Comité de Gates para detectar trabajo diferido; canalizar decisiones con producto. |
| Datos sensibles en telemetría | Revisar estructura con SecOps/Legal; anonimizar requestId y limitar retención a 30 días; registrar decisión en `docs/policies/data-handling.md`. |
| Fatiga por advertencias | Establecer SLA de saneamiento (24h reconocimiento, 3 días resolución) y activar sprint-focus si se acumulan >20 warnings por módulo. |
| Componentes legacy no alineados | Auditoría específica de módulos heredados (`core/taskdb/sqlite.ts`, `cli-reports.mjs`) y plan de refactor o aislamiento documentado. |
| Falta de pruebas automáticas del nuevo framework | Añadir suite de tests (unit + smoke) para hooks graduales y telemetría en CI antes del despliegue general. |
| Falta de comunicación con negocio | Reporte quincenal al comité de producto con estado de madurez y ETA de ADRs; registrar acuerdos. |
| Nueva burocracia (comités/reportes) | Estimar costo en horas cada trimestre; eliminar rituales sin impacto medible; limitar reuniones a 30 min con agenda fija. |
| Éxito sostenido degrada vigilancia | Aplicar protocolo de Modulación de Gobernanza para bajar la intensidad sin perder readiness. |
| Deuda del sistema de telemetría | Asignar owner dedicado (Plataforma) con presupuesto de 5% del sprint para mantenimiento y evolución. |
| Patrones observables ignorados | Auditar adopción en cada planificación trimestral; bloquear promociones a staging sin checklist cumplido. |
| Dependencias externas inestables | Catalogar proveedores críticos con respuestas definidas (degradar a warning, ticket P3); establecer monitoreo y alertas específicas. |


---

## 8. Próximos Pasos Inmediatos

1. Asignar responsables para instrumentación de métricas (Plataforma) y remediación TS (TaskDB Core).
2. Iniciar desarrollo de hooks graduales en una rama controlada; completar pruebas en dev/staging.
3. Presentar borrador del protocolo de presupuesto de errores al comité en 48 horas.
4. Programar la sesión de capacitación del equipo en los próximos 5 días.
5. Documentar plan de rollback y procedimientos de contingencia en `OPERATIONS_PLAYBOOK_COMPLETE.md`.
6. Ejecutar auditoría de herramientas y ensayo piloto según `ENSAYOS-Y-AUDITORIAS-GATES.md`.
7. Coordinar revisión legal/compliance de la telemetría propuesta.
8. Definir runbook del modo seguro con criterios cuantitativos y cadena de aprobación.
9. Instrumentar métrica de churn de código para detectar sesgo por métricas.
10. Publicar presupuesto de tiempo para saneamiento por sprint (5-10%) y mecanismo de escalamiento.
11. Asignar owner de telemetría de gates y reservar 5% del sprint para mantenimiento.
12. Publicar patrones de arquitectura observables y adoptarlos como criterio de revisión.
13. Incluir medición del presupuesto de gobernanza en la agenda del Comité de Gates.
14. Programar el primer simulacro trimestral (Game Day) y documentar resultados.
15. Completar catálogo de dependencias externas con modos de fallo definidos.
16. Establecer revisión trimestral de adopción de patrones observables.
17. Auditar servicios existentes contra el patrón observable y generar backlog de remediación.

---

**Estado:** ✔️ Plan formalizado, pendiente ejecución.  
**Revisión próxima:** Comité de Gates — 2025-01-29.
