---
name: stability-runner
description: Ejecuta validación de gates en entorno Archon (stability mode)
---

Objetivo: validar gates A–E en entorno aislado sin romper políticas.

Entrada: $ARGUMENTS (edge|all|compose)

Políticas:
- Sin sudo/auto-instalaciones; usar contenedor o runner local.
- Templates OFF por defecto; MCP disable-when-unavailable.

Flujo:
1) Detectar Docker/Compose. Si disponibles y $ARGUMENTS contiene "compose":
   - docker compose -f archon/compose.yml build
   - docker compose -f archon/compose.yml run --rm tester bash archon/edge-matrix.sh
2) Si no se usa contenedor o $ARGUMENTS=edge/all:
   - bash archon/archon-run.sh ${ARGUMENTS:-all}
3) Generar reporte:
   - bash archon/report-merge.sh
4) Resumir resultados (lint, init, flags, unit, edge) y mapear a gates A–E.

Salida esperada:
- Resumen de suites y estado de gates con recomendaciones.

