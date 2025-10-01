# Handoff Contract Templates

Guias estandarizadas para coordinar Planner -> Executor -> Tester -> Doc en el flujo MPC autonomo.

## Seccion comun
- `task_id`: identificador unico de la tarea.
- `router_rule_id`: regla que origino la derivacion (`router.yaml`).
- `thread_state_ref`: referencia compartida (`orchestration/context/thread-state-payloads.mjs`).
- `deadline_ms`: limite de latencia heredado del budget.

## Planner -> Executor (`refactor`)
```
task_id: ${task_id}
intent: refactor
scope:
  files:
    - ${primary_file}
  constraints:
    - Mantener compatibilidad de API publica.
    - Preferir cambios minimos.
artifacts:
  context_diff: ${diff_snippet}
  tests_relevant: ${suggested_tests}
success:
  - Codigo compila.
  - Tests recomendados pasan.
rollback_plan: ${rollback_hint}
```

## Planner -> Executor (`bugfix`)
```
task_id: ${task_id}
intent: bugfix
regression_reference: ${issue_ref}
scope:
  reproduction: ${repro_steps}
  files_suspectos:
    - ${file_a}
artifacts:
  failing_log: ${log_excerpt}
  hypothesis: ${root_cause_hypothesis}
exit_criteria:
  - Prueba de regresion pasa.
  - No se introducen nuevos warnings.
risk_mitigation: ${mitigation}
```

## Planner -> Executor (`tests`)
```
task_id: ${task_id}
intent: test
coverage_gap: ${metric}
files_objetivo:
  - ${path_glob}
artifacts:
  prod_issue_context: ${context}
  harness_disponible: ${harness}
expected_outputs:
  - Nuevos tests agregados.
  - Regresion descrita cubiera.
```

## Planner -> Executor (`docstring`)
```
task_id: ${task_id}
intent: docstring
modules:
  - ${module_name}
unified_styleguide: ${style_ref}
artifacts:
  api_contract: ${signature}
  existing_docs: ${doc_link}
success:
  - Docstrings siguen guia ${style_ref}.
  - No se modifican firmas.
```

## Planner -> Executor (`lint`)
```
task_id: ${task_id}
intent: lint
linter: ${tool}
errors:
  - ${error_code}
context:
  log_excerpt: ${log_excerpt}
required_evidence:
  - Patch corrige warnings listados.
  - Incluir output actualizado en evidencia.
```

## Executor -> Tester
```
task_id: ${task_id}
intent: ${intent}
changeset_ref: ${diff_ref}
tests_sugeridos:
  - ${test_command}
context:
  manual_steps: ${manual_steps}
rollback: ${rollback_hint}
```

## Tester -> Doc
```
task_id: ${task_id}
intent: ${intent}
summary:
  cambio_clave: ${change_summary}
  impacto_usuario: ${impact}
test_results:
  passed:
    - ${command}
  skipped:
    - ${command}
notes:
  - ${note}
```

## Critic -> Executor (loop opcional)
```
task_id: ${task_id}
intent: ${intent}
issue_detected: ${critic_issue}
blocking: ${true_false}
required_actions:
  - ${action}
evidence:
  logs: ${log_excerpt}
```

## Policy -> Orchestrator
```
task_id: ${task_id}
intent: ${intent}
status: ${approved|rejected}
violations:
  - policy: ${policy_name}
    reason: ${text}
```
