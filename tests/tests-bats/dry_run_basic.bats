#!/usr/bin/env bats

@test "initializer supports dry-run" {
  run bash -lc "CLAUDE_INIT_SKIP_DEPS=1 ./claude-project-init.sh --dry-run --name demo --type generic"
  [ "$status" -eq 0 ]
  [[ "$output" =~ "[DRY-RUN]" ]]
}

