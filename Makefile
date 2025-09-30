.PHONY: plan orchestrate status clean help

# Default target
help:
	@echo "Available targets:"
	@echo "  plan        - Build plan.json from PLAN.yaml"
	@echo "  orchestrate - Run complete orchestration (plan + create + exec)"
	@echo "  status      - Show workflow status"
	@echo "  clean       - Clean workflow artifacts"
	@echo "  help        - Show this help"

plan:
	npm run plan:build

orchestrate: plan
	npm run wf:create && npm run wf:exec

status:
	npm run wf:status

clean:
	npm run wf:clean || true
