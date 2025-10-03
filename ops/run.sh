#!/usr/bin/env bash
# ops/run.sh — Wrapper de "targets" sin Makefile
# Uso:
#   ./ops/run.sh help
#   ./ops/run.sh acceptance
#   ./ops/run.sh observability up|down
#   ./ops/run.sh metrics validate [URL]
#   ./ops/run.sh qa            # QA de Context Agent en Docker
#   ./ops/run.sh bench         # Benchmark del Context Agent
#   ./ops/run.sh analyze       # Analiza logs/bench JSONL
#   ./ops/run.sh clean         # Limpia artefactos de logs

set -euo pipefail

ROOT_DIR="$( cd -- "$( dirname -- "${BASH_SOURCE[0]}" )"/.. &> /dev/null && pwd )"
cd "$ROOT_DIR"

COMPOSE_OBS="ops/docker-compose.observability.yml"
PROM_RULES="ops/prometheus"
LOGS_DIR="logs"
QA_OUT="${LOGS_DIR}/qa"
BENCH_OUT="${LOGS_DIR}"

die() { echo "❌ $*" >&2; exit 1; }
info(){ echo "➡️  $*"; }
ok()  { echo "✅ $*"; }

ensure_tools() {
  command -v docker >/dev/null || die "docker no encontrado"
  command -v docker compose >/dev/null || die "'docker compose' no encontrado"
}

sha256_file() {
  local f="$1"
  if command -v shasum >/dev/null; then
    shasum -a 256 "$f" | awk '{print $1}'
  elif command -v sha256sum >/dev/null; then
    sha256sum "$f" | awk '{print $1}'
  else
    die "No hay shasum/sha256sum disponible"
  fi
}

cmd_help() {
cat <<'EOF'
QuanNex Ops Runner (sin Makefile)

Comandos:
  help                          Muestra esta ayuda
  acceptance                    Corre el acceptance test (ops/acceptance-test.sh)
  observability up              Levanta Prometheus + Grafana + Alertmanager
  observability down            Baja el stack de observabilidad
  metrics validate [URL]        Valida endpoint /metrics (default: http://localhost:3000/metrics)
  prom rules-check              Valida reglas de Prometheus (promtool)
  qa                            Ejecuta suite QA del Context Agent (docker)
  bench                         Ejecuta benchmark del Context Agent (docker)
  analyze                       Analiza logs/bench JSONL y genera hash
  clean                         Limpia artefactos de logs

Ejemplos:
  ./ops/run.sh observability up
  ./ops/run.sh metrics validate http://localhost:3000/metrics
  ./ops/run.sh qa
  ./ops/run.sh bench && ./ops/run.sh analyze
EOF
}

cmd_acceptance() {
  ensure_tools
  [ -x ops/acceptance-test.sh ] || die "ops/acceptance-test.sh no existe o no es ejecutable"
  info "Corriendo acceptance-test…"
  bash ops/acceptance-test.sh
  ok "Acceptance test OK"
}

cmd_observability_up() {
  ensure_tools
  info "Levantando observabilidad…"
  docker compose -f "$COMPOSE_OBS" up -d
  ok "Prometheus(9090), Grafana(3001), Alertmanager(9093) arriba"
}

cmd_observability_down() {
  ensure_tools
  info "Bajando observabilidad…"
  docker compose -f "$COMPOSE_OBS" down -v
  ok "Observabilidad abajo"
}

cmd_metrics_validate() {
  local url="${1:-http://localhost:3000/metrics}"
  [ -x ops/scripts/metrics-validate.sh ] || die "ops/scripts/metrics-validate.sh no existe o no es ejecutable"
  info "Validando métricas en ${url}…"
  bash ops/scripts/metrics-validate.sh "$url"
  ok "Métricas válidas"
}

cmd_prom_rules_check() {
  ensure_tools
  [ -d "$PROM_RULES" ] || die "No existe $PROM_RULES"
  info "Validando reglas de Prometheus con promtool…"
  # Validación básica de sintaxis YAML
  for rule_file in "${ROOT_DIR}/${PROM_RULES}"/*.yaml; do
    if [ -f "$rule_file" ]; then
      echo "Validando $(basename "$rule_file")..."
      # Verificar que contenga 'groups:' y 'rules:'
      grep -q 'groups:' "$rule_file" || die "Falta 'groups:' en $(basename "$rule_file")"
      grep -q 'rules:' "$rule_file" || die "Falta 'rules:' en $(basename "$rule_file")"
      grep -q 'QuanNexMetricsMissing' "$rule_file" || die "Falta alerta QuanNexMetricsMissing en $(basename "$rule_file")"
    fi
  done
  ok "Reglas OK"
}

cmd_qa() {
  ensure_tools
  mkdir -p "$QA_OUT"
  info "Ejecutando QA del Context Agent en Docker…"
  docker compose -f docker/context/compose.yml up -d context
  docker compose -f docker/context/compose.yml run --rm \
    -e TARGET_URL="http://context:8601" \
    -e QA_OUT_DIR="${QA_OUT}" \
    -e NODE_ENV="test" \
    qa
  if [ -f "${QA_OUT}/qa.jsonl" ]; then
    local h; h="$(sha256_file "${QA_OUT}/qa.jsonl")"
    echo "sha256:${h}" > "${QA_OUT}/qa.jsonl.hash"
    ok "QA OK — Artefactos en ${QA_OUT}"
  else
    die "No se generó ${QA_OUT}/qa.jsonl (QA falló?)"
  fi
}

cmd_bench() {
  ensure_tools
  info "Ejecutando benchmark del Context Agent…"
  docker compose -f docker/context/compose.yml up -d context
  docker compose -f docker/context/compose.yml run --rm bench || die "bench falló"
  ok "Benchmark finalizado — revisa ${BENCH_OUT}/context-bench.jsonl"
}

cmd_analyze() {
  ensure_tools
  local f="${BENCH_OUT}/context-bench.jsonl"
  [ -f "$f" ] || die "No existe ${f} (corre 'bench' primero)"
  info "Analizando ${f}…"
  node tools/context-analyze.mjs "$f" || die "analyze falló"
  local h; h="$(sha256_file "$f")"
  echo "sha256:${h}" > "${f}.hash"
  ok "Análisis OK — hash en ${f}.hash"
}

cmd_clean() {
  info "Limpiando artefactos de logs…"
  rm -rf "${LOGS_DIR:?}/"*
  ok "Limpieza OK"
}

main() {
  local cmd="${1:-help}"; shift || true
  case "$cmd" in
    help)                 cmd_help ;;
    acceptance)           cmd_acceptance ;;
    observability)        case "${1:-}" in
                            up) cmd_observability_up ;;
                            down) cmd_observability_down ;;
                            *) die "Uso: observability {up|down}" ;;
                          esac ;;
    metrics)              case "${1:-}" in
                            validate) shift || true; cmd_metrics_validate "${1:-}";;
                            *) die "Uso: metrics validate [URL]" ;;
                          esac ;;
    prom)                 case "${1:-}" in
                            rules-check) cmd_prom_rules_check ;;
                            *) die "Uso: prom rules-check" ;;
                          esac ;;
    qa)                   cmd_qa ;;
    bench)                cmd_bench ;;
    analyze)              cmd_analyze ;;
    clean)                cmd_clean ;;
    *)                    die "Comando desconocido: $cmd (usa: help)" ;;
  esac
}

main "$@"
