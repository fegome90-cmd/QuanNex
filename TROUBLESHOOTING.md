# QuanNex Troubleshooting Guide

Este documento proporciona una guía de resolución de problemas para el sistema QuanNex.

## Árbol de Decisión para Errores Comunes

### 1. Error: "Árbol de trabajo no está limpio"

```
¿Hay archivos modificados?
├─ SÍ → ¿Son cambios importantes?
│  ├─ SÍ → git add . && git commit -m "message"
│  └─ NO → git stash
└─ NO → ¿Hay archivos no rastreados?
   ├─ SÍ → ¿Son archivos de test temporales?
   │  ├─ SÍ → rm -f <archivo>
   │  └─ NO → git add . && git commit -m "message"
   └─ NO → Verificar git status --porcelain
```

**Comandos útiles**:
```bash
# Ver estado del árbol
git status --porcelain

# Limpiar archivos temporales
rm -f test-*.txt *.tmp

# Hacer commit de cambios
git add . && git commit -m "Fix: clean working tree"

# Stash cambios temporales
git stash push -m "temporary changes"
```

---

### 2. Error: "Fix no permitido"

```
¿El tipo de fix está en config/fixes.json?
├─ NO → Agregar a allowed array
└─ SÍ → ¿El riesgo total excede el límite?
   ├─ SÍ → Reducir número de acciones o usar acciones de menor riesgo
   └─ NO → Verificar sintaxis del JSON de entrada
```

**Comandos útiles**:
```bash
# Verificar configuración de fixes
cat config/fixes.json

# Verificar riesgo de acciones
node -e "
const policy = JSON.parse(require('fs').readFileSync('config/fixes.json', 'utf8'));
const actions = [{'type': 'install_missing_dep', 'name': 'supertest', 'dev': true}];
const risk = actions.reduce((s, a) => s + (policy.risk_levels[a.type] ?? 2), 0);
console.log('Risk:', risk, 'Max:', policy.max_risk_total);
"
```

---

### 3. Error: "Handler faltante"

```
¿El tipo de acción está implementado en scripts/autofix.mjs?
├─ NO → Implementar handler
└─ SÍ → ¿Está en el objeto handlers?
   ├─ NO → Agregar al objeto handlers
   └─ SÍ → Verificar sintaxis del handler
```

**Comandos útiles**:
```bash
# Ver handlers disponibles
grep -n "async.*(" scripts/autofix.mjs

# Verificar sintaxis
node -c scripts/autofix.mjs
```

---

### 4. Error: "Policy violation"

```
¿Se está usando una API prohibida?
├─ SÍ → ¿Es en un archivo permitido?
│  ├─ SÍ → Verificar config/policies.json
│  └─ NO → Usar API alternativa o solicitar excepción
└─ NO → Verificar AST parsing
```

**Comandos útiles**:
```bash
# Ver políticas actuales
cat config/policies.json

# Verificar archivo específico
node scripts/policy-check.mjs src/example.js

# Ver reporte SARIF
cat artifacts/policy-check.sarif
```

---

### 5. Error: "Workflow gate failed"

```
¿El perfil se detecta correctamente?
├─ NO → Verificar config/profiles.yaml y archivos del proyecto
└─ SÍ → ¿El playbook existe?
   ├─ NO → Agregar playbook a config/playbooks.yaml
   └─ SÍ → ¿Los pasos del playbook existen?
      ├─ NO → Implementar pasos faltantes
      └─ SÍ → Verificar ejecución de pasos
```

**Comandos útiles**:
```bash
# Detectar perfil manualmente
node -e "
import('./src/workflow/detect.mjs').then(m => {
  const result = m.detectProfile();
  console.log('Profile:', result.profile, 'Score:', result.score);
});
"

# Ver playbooks disponibles
cat config/playbooks.yaml

# Ejecutar paso específico
npm run context:compact
```

---

### 6. Error: "Artifacts gate failed"

```
¿Se crea el directorio artifacts/autofix/?
├─ NO → Verificar permisos de escritura
└─ SÍ → ¿Se crea el archivo JSON?
   ├─ NO → Verificar función createArtifact
   └─ SÍ → ¿El JSON es válido?
      ├─ NO → Verificar serialización
      └─ SÍ → Verificar contenido requerido
```

**Comandos útiles**:
```bash
# Verificar directorio
ls -la artifacts/autofix/

# Verificar archivo más reciente
ls -t artifacts/autofix/*.json | head -1 | xargs cat | jq .

# Verificar permisos
ls -la artifacts/
```

---

### 7. Error: "Metrics cardinality exceeded"

```
¿Hay muchas series de métricas?
├─ SÍ → ¿Se están normalizando los labels?
│  ├─ NO → Verificar funciones normalize*
│  └─ SÍ → ¿Se están usando buckets fijos?
      ├─ NO → Usar buckets fijos en histogramas
      └─ SÍ → Reducir número de métricas
└─ NO → Verificar registro de métricas
```

**Comandos útiles**:
```bash
# Ver salud de métricas
node -e "
import('./src/metrics/autofix-metrics-optimized.mjs').then(m => {
  const health = m.getMetricsHealth();
  console.log('Health:', health);
});
"

# Ver métricas registradas
curl -s http://localhost:3000/metrics | grep -c "^[a-zA-Z]"
```

---

## Problemas de Rendimiento

### AutoFix lento
- **Causa**: Muchas acciones o acciones complejas
- **Solución**: 
  - Usar `dryRun=true` primero para estimar tiempo
  - Dividir en múltiples ejecuciones
  - Optimizar handlers

### Workflow lento
- **Causa**: Pasos del playbook lentos
- **Solución**:
  - Verificar `npm run verify` individualmente
  - Optimizar pasos específicos
  - Usar playbook más simple

### Métricas lentas
- **Causa**: Cardinalidad alta o registro frecuente
- **Solución**:
  - Reducir cardinalidad de labels
  - Usar sampling
  - Optimizar funciones de registro

---

## Problemas de Integración

### CI/CD falla
- **Causa**: Gates fallando o dependencias faltantes
- **Solución**:
  - Verificar que todos los gates pasen localmente
  - Instalar dependencias correctas
  - Verificar variables de entorno

### Cursor MCP no funciona
- **Causa**: Servidor MCP no iniciado o configuración incorrecta
- **Solución**:
  - Verificar `mcp.json` en Cursor
  - Reiniciar Cursor
  - Verificar logs del servidor MCP

### Prometheus no recibe métricas
- **Causa**: Endpoint no configurado o servidor no iniciado
- **Solución**:
  - Verificar `METRICS_URL`
  - Iniciar servidor de métricas
  - Verificar conectividad

---

## Logs y Debugging

### Habilitar logs detallados
```bash
# AutoFix
DEBUG=autofix:* npm run autofix:dry

# Workflow
DEBUG=workflow:* npm run workflow:adaptive

# Policy check
DEBUG=policy:* npm run gate:policy
```

### Ver logs de CI
```bash
# GitHub Actions
gh run list --limit 5
gh run view <run-id> --log

# Local CI simulation
npm run verify
```

### Ver métricas en tiempo real
```bash
# Dashboard
npm run dashboard

# Métricas raw
curl -s http://localhost:3000/metrics | grep qn_
```

---

## Contacto y Soporte

### Documentación
- `USAGE.md`: Contratos de comandos
- `README.md`: Documentación general
- `config/`: Archivos de configuración

### Issues
- Crear issue en GitHub con:
  - Descripción del problema
  - Pasos para reproducir
  - Logs relevantes
  - Configuración del sistema

### Contribuciones
- Fork del repositorio
- Crear rama para fix
- Tests y documentación
- Pull request
