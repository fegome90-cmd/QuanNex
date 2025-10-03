#!/usr/bin/env bash
set -euo pipefail

# E2E Run Script Anti-Manipulación
# Ejecuta tests e2e en Docker con entorno hermético y FS read-only

echo "🐳 [E2E-DOCKER] Iniciando tests e2e en Docker..."

# Limpiar contenedores previos
echo "🧹 Limpiando contenedores previos..."
docker stop quannex-e2e-test 2>/dev/null || true
docker rm quannex-e2e-test 2>/dev/null || true

# Build imagen de test
echo "🔨 Construyendo imagen de test..."
docker build -f Dockerfile.test -t quannex-e2e-test .

# Crear directorio temporal para reportes
mkdir -p reports artifacts

# Ejecutar tests e2e en contenedor con restricciones
echo "🚀 Ejecutando tests e2e en contenedor..."
docker run --rm \
  --name quannex-e2e-test \
  --read-only \
  --tmpfs /tmp:rw,size=64m \
  --tmpfs /app/reports:rw,size=32m \
  --tmpfs /app/artifacts:rw,size=32m \
  --network bridge \
  -p 3000:3000 \
  -e NODE_ENV=ci \
  -e CI=true \
  quannex-e2e-test &

CONTAINER_PID=$!

# Esperar a que el contenedor esté listo
echo "⏳ Esperando a que el contenedor esté listo..."
sleep 5

# Verificar que el contenedor esté corriendo
if ! docker ps | grep -q quannex-e2e-test; then
  echo "❌ Contenedor no está corriendo"
  exit 1
fi

# Health check
echo "❤️ Verificando salud del contenedor..."
for i in {1..10}; do
  if curl -sf http://localhost:3000/health > /dev/null 2>&1; then
    echo "✅ Contenedor saludable"
    break
  fi
  echo "⏳ Intento $i/10 - esperando salud del contenedor..."
  sleep 2
done

# Ejecutar gates de integridad
echo "🔍 Ejecutando gates de integridad..."

# Metrics Integrity Gate
echo "📊 Ejecutando Metrics Integrity Gate..."
if ! node scripts/metrics-integrity.mjs; then
  echo "❌ Metrics Integrity Gate falló"
  kill $CONTAINER_PID 2>/dev/null || true
  exit 1
fi

# Coverage Gate
echo "📈 Ejecutando Coverage Gate..."
if ! node scripts/coverage-gate.mjs; then
  echo "❌ Coverage Gate falló"
  kill $CONTAINER_PID 2>/dev/null || true
  exit 1
fi

# No-Mock Gate
echo "🚫 Ejecutando No-Mock Gate..."
if ! node scripts/no-mock-gate.mjs; then
  echo "❌ No-Mock Gate falló"
  kill $CONTAINER_PID 2>/dev/null || true
  exit 1
fi

# Anti-Tamper Gate
echo "🛡️ Ejecutando Anti-Tamper Gate..."
if ! node scripts/anti-tamper.mjs; then
  echo "❌ Anti-Tamper Gate falló"
  kill $CONTAINER_PID 2>/dev/null || true
  exit 1
fi

# Report Schema Gate
echo "📋 Ejecutando Report Schema Gate..."
if ! node scripts/report-validate.mjs; then
  echo "❌ Report Schema Gate falló"
  kill $CONTAINER_PID 2>/dev/null || true
  exit 1
fi

# Copiar reportes del contenedor
echo "📄 Copiando reportes del contenedor..."
docker cp quannex-e2e-test:/app/reports/ ./reports/ 2>/dev/null || true
docker cp quannex-e2e-test:/app/artifacts/ ./artifacts/ 2>/dev/null || true

# Detener contenedor
echo "🛑 Deteniendo contenedor..."
kill $CONTAINER_PID 2>/dev/null || true
docker stop quannex-e2e-test 2>/dev/null || true
docker rm quannex-e2e-test 2>/dev/null || true

echo "✅ Tests e2e en Docker completados exitosamente"
echo "📊 Reportes disponibles en: reports/ y artifacts/"

# Mostrar resumen de reportes
if [ -f "reports/e2e-test-report.json" ]; then
  echo "📋 Resumen del reporte e2e:"
  cat reports/e2e-test-report.json | jq '.summary' 2>/dev/null || echo "Reporte no válido"
fi
