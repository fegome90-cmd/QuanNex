# SecScan Agent

## Purpose

Aggregates SCA, SAST, secrets, and container scans to block risky merges.

## Inputs

- Node manifests, Python sources, Dockerfiles
- Security tooling configs (`tools/*.sh`, future `.semgrep.yml`, `.gitleaks.toml`)

## Outputs

- `reports/security/npm-audit.json`
- `reports/security/pip-audit.json`
- `reports/security/semgrep.sarif`
- `reports/security/gitleaks.json`
- Summary JSON (schema: `schemas/secscan-report.schema.json`)

## Commands

```bash
bash tools/node-audit.sh
bash tools/python-audit.sh audit
semgrep --config auto --sarif --output reports/security/semgrep.sarif
gitleaks detect --redact --report-path reports/security/gitleaks.json
```

## Fail Conditions

- Any high/critical CVE detected
- Secret match without baseline acknowledgement
- Semgrep findings severity `HIGH`
