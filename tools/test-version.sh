#!/bin/bash
# tools/test-version.sh
# Ejecuta tests para una versión específica

set -euo pipefail

VERSION=${1:-latest}
TEST_TYPE=${2:-all}

echo "🧪 Testing versión ${VERSION} (${TEST_TYPE})"

case $TEST_TYPE in
  "unit")
    echo "Running unit tests for ${VERSION}..."
    npm test -- --testPathPattern="tests/unit/${VERSION}/"
    ;;
  "integration")
    echo "Running integration tests for ${VERSION}..."
    npm test -- --testPathPattern="tests/integration/${VERSION}/"
    ;;
  "e2e")
    echo "Running e2e tests for ${VERSION}..."
    npm test -- --testPathPattern="tests/e2e/"
    ;;
  "all")
    echo "Running all tests for ${VERSION}..."
    npm test -- --testPathPattern="tests/.*/${VERSION}/"
    ;;
  *)
    echo "Usage: $0 <version> <test_type>"
    echo "Test types: unit, integration, e2e, all"
    exit 1
    ;;
esac

echo "✅ Tests completados para ${VERSION}"
