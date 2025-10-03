#!/usr/bin/env bash
set -euo pipefail
echo ">>> Build"
npm run --silent build

echo ">>> PASS expected (config defaults)"
if node dist/cli/quannex-cli.js check --input reports/sample_ok.md; then
  echo "PASS ok ✅"
else
  echo "PASS failed ❌"; exit 1
fi

echo ">>> FAIL expected (config defaults)"
if node dist/cli/quannex-cli.js check --input reports/sample_fail.md; then
  echo "FAIL not triggered ❌"; exit 1
else
  echo "FAIL ok (blocked) ✅"
fi

echo ">>> OVERRIDE policy/metrics"
if node dist/cli/quannex-cli.js check --input reports/sample_ok.md --metrics testdata/metrics.json --policy gates/review.policy.yaml; then
  echo "Override ok ✅"
else
  echo "Override failed ❌"; exit 1
fi

echo ">>> All tests passed! 🎉"
