## Usage Guide

### Initializer flags
- `--name`, `--type`, `--path`, `--yes`, `--dry-run`
- `--use-templates on|off|auto` and `--templates-path templates`
- `CLAUDE_INIT_INCLUDE_DEPLOY=1` to copy Docker/docker-compose and deploy workflow
- `CLAUDE_INIT_SKIP_DEPS=1` to skip dep checks (CI/dry runs)

### Strict modes (CI)
- ESLint: `ESLINT_STRICT=1` (fails on findings); default is non‑strict with warnings.
- PHI: `PHI_STRICT=1` (fails on PHI); allowlist domains via `PHI_ALLOW_DOMAINS=example.com|test.com`.
- Security: `SECURITY_STRICT=1` (fails on findings); default warns.
- Deploy: `DEPLOY_STRICT=1` (fails if required files missing); default warns.
- Target project dir: `PROJECT_DIR=/abs/path` (used by integration-test and sub‑scripts).

### CI example (GitHub Actions)
```yaml
name: CI
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '18' }
      - run: |
          CLAUDE_INIT_SKIP_DEPS=1 CLAUDE_INIT_INCLUDE_DEPLOY=1 \
          ./claude-project-init.sh --name demo --type fullstack --use-templates on --templates-path templates --yes --path /tmp
      - run: |
          PROJECT_DIR=/tmp/demo \
          ESLINT_STRICT=1 PHI_STRICT=1 SECURITY_STRICT=1 DEPLOY_STRICT=1 \
          ./scripts/integration-test.sh
```

### Healthcheck expectations
- Validates `.claude/*` structure, CLAUDE.md content per project type.
- Ensures Playwright MCP for visual-validator; PHI checker for medical.

