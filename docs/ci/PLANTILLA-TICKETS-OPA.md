# 📋 Plantilla de Creación de Tickets - OPA

**Fecha**: 2025-10-04  
**Propósito**: Plantillas copy-paste para crear tickets en Jira/Linear/GitHub Projects

---

## 🎫 **OBS-OPA-050**: Exponer métrica `opa_plan_active{env,repo,plan}` a Prometheus

**Título**: `[OPA] Exponer métrica opa_plan_active{env,repo,plan} a Prometheus (Pushgateway/collector)`

**Descripción**:
Implementar publicación de métrica `opa_plan_active{env,repo,plan}` a Prometheus para visibilidad operacional del plan OPA activo. La métrica debe exponerse via Pushgateway o collector en CI/CD, con formato de texto plano y etiquetas de entorno, repositorio y plan (A/B/C).

**Criterios de Aceptación**:
- [ ] Métrica `opa_plan_active{env,repo,plan}` visible en Prometheus
- [ ] Formato: `opa_plan_active{env="stg",repo="acme/app",plan="B"} 1`
- [ ] Actualización automática en cada run de CI
- [ ] Documentación en `docs/ci/EVIDENCIAS-OPA.md`
- [ ] Evidencia: screenshot de métrica en Prometheus

---

## 🎫 **DASH-OPA-051**: Panel Grafana "OPA – Plan activo por entorno"

**Título**: `[OPA] Panel Grafana: OPA – Plan activo por entorno`

**Descripción**:
Crear panel en Grafana para visualizar el plan OPA activo por entorno. El panel debe incluir tabla "Plan activo por entorno" (última muestra por env) y serie temporal apilada por plan (sum by(plan, env)) con anotaciones al cambiar de plan (PR/Run IDs).

**Criterios de Aceptación**:
- [ ] Panel "OPA – Plan activo por entorno" creado en Grafana
- [ ] Tabla con última muestra por entorno
- [ ] Serie temporal apilada por plan
- [ ] Anotaciones con PR/Run IDs al cambiar plan
- [ ] Acceso configurado para equipo de operaciones
- [ ] Evidencia: link al panel + screenshot

---

## 🎫 **QA-OPA-031**: Test de integración anti-data.yaml

**Título**: `[OPA] Test de integración que falla si se usa -d data.yaml sin validación de esquema previa`

**Descripción**:
Implementar test de integración que falle automáticamente si OPA se invoca con `-d data.yaml` sin validación de esquema previa. Este test actúa como salvaguarda para prevenir reintroducción accidental de data.yaml sin validación. El script debe ejecutarse en CI antes de los jobs de OPA.

**Criterios de Aceptación**:
- [ ] Script `scripts/integration-guard-data-yaml.sh` funcional
- [ ] Falla si encuentra `-d data.yaml` sin `validate-data-yaml`
- [ ] Ejecuta en CI antes de jobs de OPA
- [ ] Mensaje de error claro con ubicaciones
- [ ] Documentación en RUNBOOK como salvaguarda temporal
- [ ] Evidencia: run de CI fallando correctamente

---

## 🎫 **SEC-OPA-012**: Reintroducir data.yaml con validación de esquema

**Título**: `[OPA] Reintroducir data.yaml con validación de esquema`

**Descripción**:
Reintroducir el uso de `data.yaml` en Plan A/B de OPA con validación de esquema previa. Implementar paso "validate-data-yaml" que valide el esquema antes de pasar `-d data.yaml` a OPA, con fallback automático a defaults si la validación falla.

**Criterios de Aceptación**:
- [ ] Esquema JSON definido para data.yaml
- [ ] Paso "validate-data-yaml" implementado
- [ ] `-d data.yaml` solo se pasa si validación OK
- [ ] Fallback automático a defaults si validación falla
- [ ] Casos de prueba: válido, inválido, ausente
- [ ] Evidencia: runs verdes + caso de fallback

---

## 🎫 **CI-OPA-044**: Validación de esquema para data.yaml

**Título**: `[OPA] Validación de esquema para data.yaml`

**Descripción**:
Implementar validación de esquema JSON para data.yaml antes de su uso en OPA. La validación debe verificar estructura, tipos de datos y valores permitidos, con logging claro de errores y fallback automático a valores por defecto.

**Criterios de Aceptación**:
- [ ] Esquema JSON Schema definido
- [ ] Validación con `yq` o herramienta similar
- [ ] Logging claro de errores de validación
- [ ] Fallback automático a defaults
- [ ] Casos de prueba documentados
- [ ] Evidencia: output de validación exitosa/fallida

---

## 🎫 **CI-OPA-045**: Pin por digest de imagen OPA en Plan B

**Título**: `[OPA] Pin por digest de imagen OPA en Plan B`

**Descripción**:
Reemplazar tag `openpolicyagent/opa:0.58.0` por digest SHA256 en Plan B para máxima inmutabilidad y seguridad. Obtener el digest oficial y actualizar el workflow para usar la imagen pinned por digest.

**Criterios de Aceptación**:
- [ ] Digest SHA256 de `openpolicyagent/opa:0.58.0` obtenido
- [ ] Workflow actualizado con `@sha256:<digest>`
- [ ] Documentación en `docs/ci/IMAGENES-PINNED.md`
- [ ] Verificación de integridad funcionando
- [ ] Plan B funciona con digest pinned
- [ ] Evidencia: diff del workflow + run ID

---

## 🎫 **QA-OPA-032**: OPA unit tests (opa test)

**Título**: `[OPA] OPA unit tests (opa test en policies/tests/*)`

**Descripción**:
Implementar unit tests para políticas OPA usando `opa test` con casos mínimos: SensitivePath ±critical, MassDeletion ±rollback. Crear estructura de tests en `policies/tests/*` e integrar en CI pipeline.

**Criterios de Aceptación**:
- [ ] Estructura `policies/tests/*.rego` creada
- [ ] Casos mínimos: SensitivePath ±critical, MassDeletion ±rollback
- [ ] Job `opa test` en CI pipeline
- [ ] Tests verdes en CI
- [ ] Cobertura de reglas documentada
- [ ] Evidencia: salida de `opa test` + enlace de CI

---

## 🎫 **SEC-OPA-060**: SARIF para violaciones OPA (Opcional)

**Título**: `[OPA] SARIF para violaciones OPA (Opcional)`

**Descripción**:
Implementar generación de SARIF para violaciones de OPA y subir a Security tab de GitHub. Convertir salida de OPA a formato SARIF estándar y usar `upload-sarif` action para exposición en Security tab.

**Criterios de Aceptación**:
- [ ] Conversión de violaciones OPA a SARIF
- [ ] Upload a Security tab con `upload-sarif`
- [ ] Violaciones visibles en Security tab
- [ ] Formato SARIF estándar
- [ ] Integración con Plan A/B/C
- [ ] Evidencia: screenshot de Security tab

---

## 📝 Instrucciones de Uso

1. **Copiar título y descripción** de cada ticket
2. **Pegar en Jira/Linear/GitHub Projects**
3. **Ajustar criterios de aceptación** según herramienta
4. **Asignar responsable** y **fecha objetivo**
5. **Actualizar RUNBOOK** con URLs reales de tickets
6. **Marcar como completado** en PARKING-SIGN-OFF

---

**Estado**: 📋 **PLANTILLAS LISTAS**  
**Uso**: Copy-paste para creación de tickets  
**Próxima acción**: Crear tickets y enlazar en documentación
