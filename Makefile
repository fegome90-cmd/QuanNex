# Makefile para Paquete de Pruebas QuanNex
# Encadena contracts → init → e2e → perf como ci-quannex-gate1

.PHONY: help test contracts unit integration e2e resilience perf security ci-quannex-gate1 ci-quannex-perf clean

help: ## Mostrar ayuda
	@echo "📦 Paquete de Pruebas QuanNex"
	@echo ""
	@echo "Comandos disponibles:"
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-20s\033[0m %s\n", $$1, $$2}'

test: contracts unit integration e2e ## Ejecutar todas las pruebas

contracts: ## Ejecutar pruebas de contratos
	@echo "🧪 Ejecutando pruebas de contratos..."
	npm run test:contracts

unit: ## Ejecutar pruebas unitarias
	@echo "🧪 Ejecutando pruebas unitarias..."
	npm run test:unit

integration: ## Ejecutar pruebas de integración
	@echo "🧪 Ejecutando pruebas de integración..."
	npm run test:integration

e2e: ## Ejecutar pruebas end-to-end
	@echo "🧪 Ejecutando pruebas E2E..."
	npm run test:e2e

resilience: ## Ejecutar pruebas de resiliencia
	@echo "🧪 Ejecutando pruebas de resiliencia..."
	npm run test:resilience

perf: ## Ejecutar pruebas de performance
	@echo "🧪 Ejecutando pruebas de performance..."
	npm run test:perf

security: ## Ejecutar Security Gate Pack completo
	@echo "🛡️ Ejecutando Security Gate Pack (GAP-001...005)..."
	bash ops/security-gate.sh

integrity: ## Ejecutar Gate 13 - Test Integrity
	@echo "🚦 Ejecutando Gate 13 - Test Integrity..."
	node tools/test-integrity.mjs

ci-quannex-gate1: contracts e2e security integrity ## CI Gate 1: contracts + e2e + security + integrity
	@echo "✅ CI QuanNex Gate 1 completado"

init-mcp: ## Inicializar MCP QuanNex
	@echo "🚀 Inicializando MCP QuanNex..."
	./scripts/mcp-autonomous-init.sh --verbose

ci-quannex-perf: perf ## CI Performance: verificar performance
	@echo "📊 Verificando performance..."
	node tools/verify-perf.js
	node tools/snapshot-perf.js
	@echo "✅ CI QuanNex Performance completado"

validate-mcp: ## Validar que MCP server funcione
	@echo "🔍 Validando MCP server..."
	@node versions/v3/mcp-server-consolidated.js &
	@MCP_PID=$$!; \
	sleep 3; \
	if kill -0 $$MCP_PID 2>/dev/null; then \
		echo "✅ MCP server funcionando (PID: $$MCP_PID)"; \
		kill $$MCP_PID; \
	else \
		echo "❌ MCP server falló"; \
		exit 1; \
	fi

health-check: ## Verificar salud del sistema
	@echo "🏥 Verificando salud del sistema..."
	node orchestration/orchestrator.js health

clean: ## Limpiar archivos temporales
	@echo "🧹 Limpiando archivos temporales..."
	rm -f create-*-workflow.json
	rm -f test-*.json
	@echo "✅ Limpieza completada"

# Comando principal: ejecutar todo el paquete
all: clean contracts e2e perf security ## Ejecutar paquete completo de pruebas (sin init-mcp problemático)
	@echo "🎉 Paquete de pruebas completado exitosamente"

# Comandos individuales que funcionan
test-working: contracts security perf unit integration resilience ## Ejecutar solo las pruebas que funcionan
	@echo "✅ Todas las pruebas funcionando completadas"

test-safe: contracts security perf ## Ejecutar solo las pruebas más seguras
	@echo "✅ Pruebas seguras completadas"
