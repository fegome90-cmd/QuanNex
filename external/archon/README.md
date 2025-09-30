# Archon Runner Package — Stability Mode

Este paquete permite ejecutar validaciones del kit en un entorno aislado (contenedor/VM Archon) sin romper las políticas del proyecto.

## Objetivos
- Reproducibilidad: mismas herramientas y locales (UTF‑8, LF) en cada ejecución.
- Seguridad: sin auto‑instalaciones en la máquina host y sin privilegios elevados.
- Estabilidad: ejecutar la matriz “edge” sin depender de red ni npm/gh/git si se desea.

## Contenido
- `Dockerfile`: imagen base con tooling (jq/rg/shellcheck/shfmt/bats).
- `compose.yml`: orquestación simple para ejecutar las suites.
- `archon-run.sh`: wrapper local (sin contenedor) con límites de recursos.
- `edge-matrix.sh`: ejecuta la matriz de pruebas edge.
- `report-merge.sh`: combina resultados en un JSON simple.

## Uso (contenedor)
```bash
# Construir imagen
docker compose -f archon/compose.yml build

# Ejecutar matriz edge
docker compose -f archon/compose.yml run --rm tester bash archon/edge-matrix.sh
```

## Uso (host / Archon OS)
```bash
# Runner local (sin instalar toolchains en el host)
bash archon/archon-run.sh edge
```

## Notas de Política
- No se auto‑instalán dependencias en el host; toda herramienta va en la imagen.
- `CLAUDE_INIT_SKIP_DEPS=1` para saltar chequeos de deps cuando se simula entorno sin npm/git/gh.
- En estabilidad, templates OFF por defecto; activar sólo para validar Gate B.
