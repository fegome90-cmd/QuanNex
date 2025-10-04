# 🔗 Catálogo de Dependencias Externas — Sistema de Gates

**Fecha:** 2025-01-27  
**Responsable:** Plataforma (Luis) + SecOps (María)

---

| Dependencia | Uso en Gates | Modo de fallo esperado | Acción del Gate | Comunicación |
| --- | --- | --- | --- | --- |
| Escáner de seguridad X | Validación MCP de firmas | API no responde >60s | Degradar verificación a warning, crear ticket P3 plataforma | Notificar #gates-watch y SecOps |
| Proveedor de identidad Y | Autenticación de hooks | Error 5xx sostenido | Bloquear sólo en prod; permitir dev/staging con bypass documentado | Anunciar en #gates-watch; aviso a IAM |
| Servicio de firmas MCP | Verificación HMAC | Respuesta inválida o latencia >5s | Activar fallback local y registrar evento | Notificar Auditoría y SecOps |
| TaskDB (telemetría) | Persistencia gate_events | Cluster en modo read-only | Switch a logging local, activar safe mode si >120 min | Plataforma + Auditoría |
| Prometheus/Grafana | Dashboards/alertas | Caída de scrape | Activar safe mode si sin datos >120 min; usar monitoreo manual | Plataforma |

**Notas:**
- Actualizar esta tabla en cada revisión trimestral del Comité de Gates.
- Para nuevas dependencias, agregar fila antes del despliegue y definir acción de gate.
