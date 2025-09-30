# Inventario de Investigación y Brainstorm

Este inventario lista el material existente para ser normalizado hacia `docs/research/`.

## Fuentes actuales
- `investigacion/`
- `brainstorm/`

## Archivos detectados (inventario actual)

- investigacion/1-exploracion-mercado/research-master-plan.md
- investigacion/1-exploracion-mercado/technology-trends/prompt-engineering-research.md
- investigacion/1-exploracion-mercado/technology-trends/ai-development-tools-trends.md
- investigacion/1-exploracion-mercado/competitive-intelligence/DAY2-COMPETITIVE-ANALYSIS-EXECUTION.md
- investigacion/1-exploracion-mercado/competitive-intelligence/DAY1-COMPETITIVE-ANALYSIS-SETUP.md
- investigacion/1-exploracion-mercado/opportunity-analysis/market-opportunity-assessment.md
- investigacion/1-exploracion-mercado/RESEARCH-BASELINE-REPORT.md
- investigacion/1-exploracion-mercado/competitive-landscape/competitive-analysis-framework.md
- investigacion/1-exploracion-mercado/user-research/user-research-methodology.md
- investigacion/1-exploracion-mercado/user-research/user-research-execution-plan.md
- investigacion/1-exploracion-mercado/github-integration-action-plan.md
- investigacion/tools-and-automation/analysis-frameworks/swot-analysis-template.md
- investigacion/tools-and-automation/research-agents/market-researcher.json
- investigacion/tools-and-automation/research-agents/user-researcher.json
- investigacion/tools-and-automation/research-agents/tech-analyst.json
- investigacion/knowledge-base/research-contexts/github-repository-context.md
- investigacion/knowledge-base/research-contexts/claude-project-init-research-context.md
- investigacion/2-planificacion-arquitectura/strategic-planning/strategic-roadmap-2025-2029.md
- investigacion/README.md
- investigacion/INVESTIGACION-MASTER-GUIDE.md
- investigacion/2-planificacion-arquitectura/technical-architecture/system-architecture-design.md
- investigacion/2-planificacion-arquitectura/technical-architecture/context-engineering-research.md
- investigacion/4-confirmacion-refinamiento/implementation-roadmap/technical-implementation-roadmap.md
- brainstorm/nuevos-comandos-propuestos.md
- brainstorm/insights-micro-saas-video.md
- brainstorm/organizacion-por-especialidades.md
- brainstorm/agente-gantt-generator-inspirado-video.md
- brainstorm/estructura-directorios-completa.md
- brainstorm/comando-pre-mortem-inspirado-video.md
- brainstorm/guia-gestion-proyectos-ia.md
- brainstorm/README.md
- brainstorm/analisis-conexiones-claude-kit.md
- brainstorm/nuevos-agentes-propuestos.md
- brainstorm/matriz-responsabilidades.md
- brainstorm/roadmap-implementacion.md

Nota: existen subdirectorios adicionales en `investigacion/` (p. ej., `2-planificacion-arquitectura/`, `3-ejecucion-validacion/`, `4-confirmacion-refinamiento/`, `knowledge-base/`, `tools-and-automation/`). El script de normalización procesará recursivamente.

## Plan de Normalización
- Destino: `docs/research/imported/{investigacion,brainstorm}/...` (estructura preservada).
- Tras migración: actualizar `INDEX.md` y `TRAZABILIDAD.md`.
- Script: `./scripts/normalize-research.sh --apply` (usa `git mv` si es posible).
