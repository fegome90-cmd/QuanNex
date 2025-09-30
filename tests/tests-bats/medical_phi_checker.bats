#!/usr/bin/env bats

@test "medical project PHI checker flags email" {
  run bash -lc '
    set -e
    ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
    TMP=$(mktemp -d)
    cd "$TMP"
    printf "p2\n4\n" | CLAUDE_INIT_SKIP_DEPS=1 bash "$ROOT/claude-project-init.sh" --use-templates on --templates-path "$ROOT/templates" >/dev/null
    cd p2
    mkdir -p logs
    echo "User email: test@example.com" > logs/app.log
    bash ./scripts/check-phi.sh .
  '
  [ "$status" -ne 0 ]
}

