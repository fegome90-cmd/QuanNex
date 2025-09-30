# Modernization Metrics

Metric collection flows through CI artifacts and can be exported to Prometheus or stored as Markdown snapshots.

## Metrics Definitions
- `obsolete_calls`: Count of deprecated APIs from lint/refactor runs (`reports/refactor/diff.patch`). Collect via `rg "deprecated" reports/refactor/diff.patch | wc -l`.
- `deps_outdated`: Number of upgrade recommendations in `advice/version_matrix.json`. Extract with `jq '[.matrix[] | select(.status != "ok")] | length'`.
- `cves_high`: High/critical vulnerabilities across npm and pip audits. Query `jq '.vulnerabilities | map(select(.severity == "high" or .severity == "critical")) | length' reports/security/npm-audit.json` plus pip output.
- `coverage_pct`: Coverage percentage from `coverage.xml`. Parse via `python - <<'PY'` snippet (see below).
- `lint_errors`: Sum of ESLint, Ruff, Shellcheck errors in `reports/lint` JSON summary.
- `build_time`: Duration of orchestrator job measured from GitHub Actions job metadata.
- `refactor_diffs`: Size in lines of `reports/refactor/diff.patch` (`wc -l`).
- `tests_added`: Delta test files vs base branch using `git diff --name-status origin/main -- '*test*'`.
- `sbom_digest`: SHA256 of `reports/sbom.json` (`shasum -a 256 reports/sbom.json`).
- `secrets_flagged`: Count of findings in `reports/security/gitleaks.json`.

## Extraction Snippets
```bash
# Coverage percent helper
python - <<'PY'
import xml.etree.ElementTree as ET
root = ET.parse('coverage.xml').getroot()
metrics = root.find('*/coverage')
line_rate = float(metrics.get('line-rate', 0))
print(line_rate * 100)
PY

# secrets_flagged
jq '.findings | length' reports/security/gitleaks.json
```

## Reporting Cadence
- On each PR: publish condensed markdown in PR comment from Orchestrator agent.
- Weekly: export metrics to `reports/metrics/week-<ISO>.md` using GitHub scheduled run.
- Monthly: push Prometheus exposition format to internal observability stack.

