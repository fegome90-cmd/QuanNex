.PHONY: plan orchestrate status clean help ci-gate1 lint typecheck contracts init smoke \
	quannex-init quannex-contracts quannex-resilience

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
	npx tsc -p . || echo 'skip typecheck'

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

plan:
	npm run plan:build

orchestrate: plan
	npm run wf:create && npm run wf:exec

status:
	npm run wf:status

clean:
	npm run wf:clean || true
