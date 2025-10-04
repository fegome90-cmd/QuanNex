# QuanNex Operations Makefile

METRICS_URL ?= http://localhost:3000/metrics
DOCKER_COMPOSE_FILE ?= ops/docker-compose.observability.yml

help:
	@echo "QuanNex Operations - Comandos disponibles:"
	@echo ""
	@echo "  ops:accept      Acceptance test 2 minutos"
	@echo "  ops:smoke       Smoke pack 60 segundos"
	@echo "  ops:rules       Validar rules con prom/promtool (docker)"
	@echo "  ops:grafana     Levanta Prometheus+Grafana con dashboard y reglas"
	@echo "  ops:down        Baja el stack de observabilidad"
	@echo "  ops:check       Pack rápido antes del PR"
	@echo "  ops:pr          Crear PR con rama ops/enterprise-metrics"

ops:accept:
	@echo "Ejecutando acceptance test..."
	bash ops/acceptance-test.sh

ops:smoke:
	@echo "Ejecutando smoke pack..."
	bash ops/scripts/smoke-pack.sh $(METRICS_URL)

ops:rules:
	@echo "Validando reglas de Prometheus..."
	docker run --rm -v $(PWD)/ops/prometheus:/rules prom/prometheus promtool check rules /rules/quannex-metrics.rules.yaml

ops:grafana:
	@echo "Levantando stack de observabilidad..."
	docker compose -f $(DOCKER_COMPOSE_FILE) up -d
	@echo "Prometheus: http://localhost:9090"
	@echo "Grafana: http://localhost:3001 (admin/admin)"

ops:down:
	@echo "Bajando stack de observabilidad..."
	docker compose -f $(DOCKER_COMPOSE_FILE) down -v

ops:check:
	@echo "Ejecutando checks rápidos..."
	make ops:rules && make ops:smoke

ops:pr:
	@echo "Creando PR para Ops Enterprise Metrics..."
	git checkout -b ops/enterprise-metrics
	git add ops/ Makefile .github/PULL_REQUEST_TEMPLATE.md .pre-commit-config.yaml
	git commit -m "feat(ops): Enterprise Metrics Integrity Gate"
	git push -u origin ops/enterprise-metrics
	@echo "PR creado: ops/enterprise-metrics"

dev:start:
	@echo "Iniciando servidor de métricas..."
	node src/server.mjs &

dev:stop:
	@echo "Deteniendo servidor de métricas..."
	pkill -f "node src/server.mjs" || true

validate:metrics:
	@echo "Validando endpoint de métricas..."
	bash ops/scripts/metrics-validate.sh $(METRICS_URL)

validate:rules:
	@echo "Validando reglas de Prometheus..."
	make ops:rules

clean:cache:
	@echo "Limpiando cache de métricas..."
	rm -rf .cache/

clean:docker:
	@echo "Limpiando contenedores Docker..."
	docker compose -f $(DOCKER_COMPOSE_FILE) down -v --remove-orphans

.PHONY: db-up db-migrate seed smoke metrics baseline

TASKDB_COMPOSE ?= docker/taskdb/docker-compose.yml
PG_USER ?= taskdb
PG_PASSWORD ?= taskdb
PG_HOST ?= localhost
PG_PORT ?= 5432
PG_DB ?= taskdb
SQLITE_PATH ?= data/taskdb.sqlite

db-up:
	@echo "Levantando stack TaskDB (docker compose -f $(TASKDB_COMPOSE) up -d pg)"
	docker compose -f $(TASKDB_COMPOSE) up -d pg

db-migrate:
	@echo "Aplicando schema TaskDB (Postgres + SQLite)"
	PGUSER=$(PG_USER) PGPASSWORD=$(PG_PASSWORD) psql "postgresql://$(PG_USER):$(PG_PASSWORD)@$(PG_HOST):$(PG_PORT)/$(PG_DB)" -f schema/taskdb.sql
	sqlite3 $(SQLITE_PATH) < schema/taskdb.sqlite.sql

seed:
	npm run taskdb:seed

smoke:
	npm run smoke:taskdb

metrics:
	npm run taskdb:metrics

baseline:
	npm run report:baseline
