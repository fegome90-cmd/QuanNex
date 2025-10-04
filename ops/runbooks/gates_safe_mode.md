# 🛡️ Runbook — Activación de `QUANNEX_GATES_SAFE_MODE`

**Última actualización:** 2025-01-27  
**Propietario:** Plataforma (Luis)  
**Contactos de apoyo:** Auditoría (Felipe), SecOps (María)

---

## 1. Propósito
Habilitar un mecanismo controlado para regresar temporalmente a la configuración legacy de gates cuando el marco gradual presenta degradaciones críticas.

---

## 2. Condiciones de Activación
Activar `QUANNEX_GATES_SAFE_MODE=true` cuando se cumpla cualquiera de las siguientes condiciones cuantificables:

1. `gates_false_positive_rate` > 0.30 durante 3 horas consecutivas o >0.20 durante 6 horas.
2. `gates_failures_hourly` duplica el umbral del ambiente (dev >10, staging >4, prod >2) en dos ventanas consecutivas.
3. Telemetría crítica (TaskDB, Prometheus o Grafana) fuera de servicio >120 minutos.
4. Se pierden commits o se corrompe la rama principal atribuible al nuevo hook.

---

## 3. Cadena de Aprobación
1. Gate Steward levanta alerta con evidencia (capturas, métricas).
2. Reunión rápida (máx. 15 min) con Plataforma, Auditoría y SecOps para confirmar criterio.
3. Plataforma activa la variable y ejecuta script de restauración.
4. Auditoría notifica al Comité de Gates y documenta en Gate Unlock Log + incidente P1.

---

## 4. Procedimiento
```bash
# 1. Activar variable en CI/CD y en repos local
export QUANNEX_GATES_SAFE_MODE=true

# 2. Ejecutar script de restauración
yarn ts-node scripts/gates/restore-legacy.ts

# 3. Verificar que los hooks legacy estén activos
ls .husky/
```

1. Confirmar que los proyectos afectados regresan a estado operativo (push de prueba controlado).
2. Mantener telemetría corriendo para analizar causa raíz.
3. Crear ticket de remediación antes de desactivar safe mode.

---

## 5. Desactivación
- Revertir variable (`export QUANNEX_GATES_SAFE_MODE=false`).
- Ejecutar de nuevo el instalador de hooks graduales.
- Validar en staging con simulaciones antes de liberar a todo el equipo.

---

## 6. Comunicación
- Mensaje inmediato a canal #gates-watch y correo a stakeholders.
- Registrar evento en Gate Unlock Log con timestamp, responsables y plan de remediación.
- Incluir postmortem en el próximo Comité de Gates.

---

## 7. Mantenimiento
- Probar el runbook en cada simulacro trimestral (Game Day).
- Actualizar comandos y dependencias cada vez que cambie la estructura de hooks.
