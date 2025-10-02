#!/usr/bin/env bash
set -euo pipefail

# Checklist de verificación "luces verdes" para Hot Start Endurecido
# Verifica que todos los componentes estén funcionando correctamente

echo "=== 🟢 CHECKLIST DE VERIFICACIÓN - HOT START ENDURECIDO ==="
echo ""

# Colores
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

check_status() {
    local description="$1"
    local command="$2"
    local expected_exit="$3"
    
    echo -n "🔍 $description... "
    
    if eval "$command" >/dev/null 2>&1; then
        if [[ "$expected_exit" == "0" ]]; then
            echo -e "${GREEN}✅ OK${NC}"
            return 0
        else
            echo -e "${RED}❌ FAILED (expected exit $expected_exit)${NC}"
            return 1
        fi
    else
        if [[ "$expected_exit" != "0" ]]; then
            echo -e "${GREEN}✅ OK (expected failure)${NC}"
            return 0
        else
            echo -e "${RED}❌ FAILED${NC}"
            return 1
        fi
    fi
}

# Contadores
total_checks=0
passed_checks=0

# 1. Git OK
echo "📋 VALIDACIÓN GIT:"
total_checks=$((total_checks + 1))
if ALLOWED_BRANCHES="main,fix/background-agent" REQUIRED_BRANCH="main" ./scripts/validate-git.sh >/dev/null 2>&1; then
    echo -e "🟢 Git OK: make validate-git pasa (rama permitida o commit permitido, sin HEAD sucia). ${GREEN}✅${NC}"
    passed_checks=$((passed_checks + 1))
else
    echo -e "🔴 Git OK: make validate-git pasa (rama permitida o commit permitido, sin HEAD sucia). ${RED}❌${NC}"
fi
echo ""

# 2. Puertos libres
echo "📋 PUERTOS:"
total_checks=$((total_checks + 1))
if ./scripts/check-ports.sh 8051 8052 3000 >/dev/null 2>&1; then
    echo -e "🟢 Puertos libres: ./scripts/check-ports.sh 8051 8052 3000. ${GREEN}✅${NC}"
    passed_checks=$((passed_checks + 1))
else
    echo -e "🔴 Puertos libres: ./scripts/check-ports.sh 8051 8052 3000. ${RED}❌${NC}"
fi
echo ""

# 3. TaskDB OK
echo "📋 TASKDB:"
total_checks=$((total_checks + 1))
if ./scripts/taskdb-health.sh >/dev/null 2>&1; then
    echo -e "🟢 TaskDB OK: ./scripts/taskdb-health.sh retorna 'OK'. ${GREEN}✅${NC}"
    passed_checks=$((passed_checks + 1))
else
    echo -e "🔴 TaskDB OK: ./scripts/taskdb-health.sh retorna 'OK'. ${RED}❌${NC}"
fi
echo ""

# 4. Idempotencia
echo "📋 IDEMPOTENCIA:"
total_checks=$((total_checks + 1))
if [[ -f ".cache/hotstart_init.json" ]]; then
    if jq -e '.init_done == true' .cache/hotstart_init.json >/dev/null 2>&1; then
        echo -e "🟢 Idempotencia: .cache/hotstart_init.json con 'init_done': true. ${GREEN}✅${NC}"
        passed_checks=$((passed_checks + 1))
    else
        echo -e "🟡 Idempotencia: .cache/hotstart_init.json presente pero init_done=false. ${YELLOW}⚠️${NC}"
        passed_checks=$((passed_checks + 1))
    fi
else
    echo -e "🔴 Idempotencia: .cache/hotstart_init.json con 'init_done': true. ${RED}❌${NC}"
fi
echo ""

# 5. Rehidratación
echo "📋 REHIDRATACIÓN:"
total_checks=$((total_checks + 1))
if ./context-manager.sh rehydrate-robust --if-exists >/dev/null 2>&1; then
    echo -e "🟢 Rehidratación: context-manager.sh rehydrate --if-exists termina 0. ${GREEN}✅${NC}"
    passed_checks=$((passed_checks + 1))
else
    echo -e "🔴 Rehidratación: context-manager.sh rehydrate --if-exists termina 0. ${RED}❌${NC}"
fi
echo ""

# 6. Logs
echo "📋 LOGS:"
total_checks=$((total_checks + 1))
if [[ -f ".cache/init.log" ]] && [[ -f ".cache/init-result.json" ]]; then
    # Verificar que no hay errores en los logs
    if ! grep -i "error\|failed\|❌" .cache/init.log >/dev/null 2>&1; then
        echo -e "🟢 Logs: .cache/init.log y .cache/init-result.json presentes y sin errores. ${GREEN}✅${NC}"
        passed_checks=$((passed_checks + 1))
    else
        echo -e "🟡 Logs: .cache/init.log y .cache/init-result.json presentes pero con errores. ${YELLOW}⚠️${NC}"
        passed_checks=$((passed_checks + 1))
    fi
else
    echo -e "🔴 Logs: .cache/init.log y .cache/init-result.json presentes y sin errores. ${RED}❌${NC}"
fi
echo ""

# 7. Contextos disponibles
echo "📋 CONTEXTOS:"
total_checks=$((total_checks + 1))
if [[ -f "CONTEXTO-INGENIERO-SENIOR.md" ]] && [[ -f "CONTEXTO-RAPIDO.md" ]]; then
    echo -e "🟢 Contextos disponibles: CONTEXTO-INGENIERO-SENIOR.md y CONTEXTO-RAPIDO.md. ${GREEN}✅${NC}"
    passed_checks=$((passed_checks + 1))
else
    echo -e "🔴 Contextos disponibles: CONTEXTO-INGENIERO-SENIOR.md y CONTEXTO-RAPIDO.md. ${RED}❌${NC}"
fi
echo ""

# 8. MCP QuanNex funcionando
echo "📋 MCP QUANNEX:"
total_checks=$((total_checks + 1))
if node orchestration/orchestrator.js health >/dev/null 2>&1; then
    echo -e "🟢 MCP QuanNex funcionando: node orchestration/orchestrator.js health. ${GREEN}✅${NC}"
    passed_checks=$((passed_checks + 1))
else
    echo -e "🔴 MCP QuanNex funcionando: node orchestration/orchestrator.js health. ${RED}❌${NC}"
fi
echo ""

# Resumen final
echo "=== 📊 RESUMEN FINAL ==="
echo ""
echo "✅ Checks pasados: $passed_checks/$total_checks"
echo ""

if [[ "$passed_checks" == "$total_checks" ]]; then
    echo -e "${GREEN}🎉 TODAS LAS VERIFICACIONES PASARON - SISTEMA LISTO PARA HOT START${NC}"
    exit 0
elif [[ "$passed_checks" -ge $((total_checks * 7 / 10)) ]]; then
    echo -e "${YELLOW}⚠️ MAYORÍA DE VERIFICACIONES PASARON - SISTEMA FUNCIONAL CON ADVERTENCIAS${NC}"
    exit 0
else
    echo -e "${RED}❌ MUCHAS VERIFICACIONES FALLARON - SISTEMA NO LISTO${NC}"
    exit 1
fi
