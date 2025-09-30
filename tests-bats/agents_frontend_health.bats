#!/usr/bin/env bats

@test "frontend project healthcheck passes" {
  run bash -lc '
    set -e
    ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
    TMP=$(mktemp -d)
    cd "$TMP"
    printf "p1\n1\n" | CLAUDE_INIT_SKIP_DEPS=1 bash "$ROOT/claude-project-init.sh" --use-templates on --templates-path "$ROOT/templates" >/dev/null
    cd p1
    bash ./healthcheck.sh
  '
  [ "$status" -eq 0 ]
}

