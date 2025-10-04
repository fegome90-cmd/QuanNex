#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR=$(cd "$(dirname "$0")/.." && pwd)
COMPOSE_FILE="${COMPOSE_FILE:-$ROOT_DIR/docker/taskdb/docker-compose.yml}"

PG_USER=${PG_USER:-taskdb}
PG_PASSWORD=${PG_PASSWORD:-taskdb}
PG_HOST=${PG_HOST:-localhost}
PG_PORT=${PG_PORT:-5432}
PG_DB=${PG_DB:-taskdb}

export PG_USER PG_PASSWORD PG_HOST PG_PORT PG_DB

if ! command -v docker >/dev/null 2>&1; then
  echo "❌ docker no está instalado" >&2
  exit 1
fi

if ! command -v docker compose >/dev/null 2>&1; then
  echo "❌ docker compose no está disponible" >&2
  exit 1
fi

echo "🚀 Levantando Postgres (docker compose -f $COMPOSE_FILE up -d pg)"
docker compose -f "$COMPOSE_FILE" up -d pg

CONN_STRING="postgresql://$PG_USER:$PG_PASSWORD@$PG_HOST:$PG_PORT/$PG_DB"

until psql "$CONN_STRING" -c '\q' >/dev/null 2>&1; do
  >&2 echo "⏳ Postgres no disponible aún - esperando"
  sleep 1
done
>&2 echo "✅ Postgres disponible - continuando"

if [[ -f "$ROOT_DIR/schema/taskdb.sql" ]]; then
  echo "🛠️  Aplicando schema a Postgres"
  psql "$CONN_STRING" -f "$ROOT_DIR/schema/taskdb.sql"
fi

SQLITE_PATH=${TASKDB_SQLITE_PATH:-$ROOT_DIR/data/taskdb.sqlite}
mkdir -p "$(dirname "$SQLITE_PATH")"

echo "🛠️  Aplicando schema a SQLite ($SQLITE_PATH)"
sqlite3 "$SQLITE_PATH" < "$ROOT_DIR/schema/taskdb.sqlite.sql"

echo "✅ Base de datos lista"
