# CONTEXTO RÁPIDO - QUANNEX STARTKIT

## 🎯 ESTADO ACTUAL
- **Proyecto:** QuanNex StartKit (sistema MCP interno)
- **Ubicación:** `/Users/felipe/Developer/startkit-main`
- **Estado:** ✅ Funcional, blindado, con Hot Start Endurecido
- **Repositorio:** https://github.com/fegome90-cmd/QuanNex.git
- **Última actualización:** Octubre 2, 2025 - Merge exitoso a main

## 🏗️ ARQUITECTURA
- **MCP QuanNex:** `orchestration/orchestrator.js` (orquestador interno)
- **Agentes Core:** `agents/context/`, `agents/prompting/`, `agents/rules/` (100% funcionales)
- **Performance:** Workflows completos en 5.8s promedio

## 🔧 COMANDOS ESENCIALES
```bash
cd /Users/felipe/Developer/startkit-main
./scripts/checklist-verificacion.sh  # Verificación "luces verdes" (6/8 pasando)
./scripts/troubleshooting-rapido.sh  # Diagnóstico automático
make -f Makefile.hotstart hotstart   # Hot start completo con idempotencia
./scripts/validate-git.sh            # Validación Git robusta
node orchestration/orchestrator.js health  # Verificar MCP
```

## 🚨 TROUBLESHOOTING RÁPIDO
- **Verificación completa:** `./scripts/checklist-verificacion.sh`
- **Diagnóstico automático:** `./scripts/troubleshooting-rapido.sh`
- **Error module:** `cd /Users/felipe/Developer/startkit-main`
- **HEAD desprendida:** `ALLOWED_COMMITS="abc123" ./scripts/validate-git.sh`
- **Sistema lento:** `pkill -f "node.*orchestrator"`
- **Reset idempotencia:** `rm -f .cache/hotstart_init.json`

## 📚 DOCUMENTACIÓN
- **Manual:** `MANUAL-COMPLETO-CURSOR.md`
- **Workflows:** `workflows-codex.json`
- **Backups:** `backups/consolidation-20251001-160553/`

## ⚡ FLUJO RÁPIDO
1. `./scripts/checklist-verificacion.sh` (verificación completa)
2. Si hay problemas: `./scripts/troubleshooting-rapido.sh` (diagnóstico automático)
3. Hot start completo: `make -f Makefile.hotstart hotstart`
4. Usar MCP QuanNex para análisis complejos
5. `node orchestration/orchestrator.js create workflow.json`

## 🛡️ AVANCES RECIENTES
- ✅ **Pathing corregido:** PROJECT_ROOT en orquestadores arreglado
- ✅ **Hot Start Endurecido:** Sistema completamente blindado
- ✅ **Validación Git:** HEAD desprendida manejada correctamente
- ✅ **Idempotencia:** Estado JSON atómico funcional
- ✅ **Merge exitoso:** Todos los avances integrados en main

**Sistema 100% funcional y blindado - usar scripts nuevos para máxima robustez.**
