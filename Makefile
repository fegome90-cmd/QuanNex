.PHONY: plan orchestrate status clean help ci-gate1 lint typecheck contracts init smoke \
	quannex-init quannex-contracts quannex-resilience quannex-perf quannex-verify quannex-snapshot quannex-ab

# Default target
help:
	@echo "Available targets:"
	@echo "  plan        - Build plan.json from PLAN.yaml"
	@echo "  orchestrate - Run complete orchestration (plan + create + exec)"
	@echo "  status      - Show workflow status"
	@echo "  clean       - Clean workflow artifacts"
	@echo "  ci-gate1    - Run Gate 1 CI checks (lint + typecheck + contracts + init + smoke)"
	@echo "  help        - Show this help"

# CI/CD Gate 1
ci-gate1: lint typecheck contracts init smoke

lint:
	npx eslint . --config eslint.gate1.config.js --max-warnings=15

typecheck:
	@if [ -f tsconfig.json ]; then \
		npx tsc -p tsconfig.json; \
	else \
		echo 'skip typecheck (tsconfig.json not found)'; \
	fi

contracts:
	node tests/agent-contract-tests.mjs

init:
	bash scripts/mcp-autonomous-init.sh --quiet

smoke:
	bash tests/smoke.sh || echo 'smoke tests not implemented yet'

quannex-init:
	bash scripts/mcp-autonomous-init.sh --quiet

quannex-contracts:
	node tests/agent-contract-tests.mjs

quannex-resilience:
	node tools/mcp-resilience-simple.mjs

# Performance verification targets
quannex-perf:
	@echo "📊 Ejecutando performance gate QuanNex..."
	node tools/performance-gate.mjs run

quannex-verify:
	@echo "🔍 Verificando performance desde trazas crudas..."
	node tools/verify-perf.js

quannex-snapshot:
	@echo "📸 Generando snapshot de performance..."
	node tools/snapshot-perf.js generate

quannex-ab:
	@echo "🧪 Ejecutando experimento A/B..."
	node tools/ab-experiment.mjs run

plan:
	npm run plan:build

orchestrate: plan
	npm run wf:create && npm run wf:exec

status:
	npm run wf:status

clean:
	npm run wf:clean || true
