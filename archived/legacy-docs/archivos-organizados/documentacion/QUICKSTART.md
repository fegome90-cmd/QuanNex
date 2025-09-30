## Quick Start

### Create a project
- Verify deps: `./scripts/verify-dependencies.sh`
- Initialize (templates on):
  - `./claude-project-init.sh --name demo --type fullstack --use-templates on --templates-path templates`
- Optional deploy templates: set `CLAUDE_INIT_INCLUDE_DEPLOY=1` when running the initializer.

### Healthcheck
- Inside the generated project: `./healthcheck.sh`
- Medical projects: `./scripts/check-phi.sh .`

### Integration tests
- Non‑strict (dev): `./scripts/integration-test.sh`
- Strict (CI/project real):
  - `PROJECT_DIR=/path/to/project ESLINT_STRICT=1 PHI_STRICT=1 SECURITY_STRICT=1 DEPLOY_STRICT=1 ./scripts/integration-test.sh`
  - Output: `integration-test-report.json`

### Examples
- ESLint example: `cd examples/eslint-basic && npm ci && npm run lint`

### Release (maintainers)
- `./scripts/release.sh --bump patch --update-init-version --tag`
- Push tag after CI pins.

