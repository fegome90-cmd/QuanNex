package pr.security

default allow = true

# Definir paths sensibles
sensitive_path(p) { startswith(p, "rag/") }
sensitive_path(p) { startswith(p, "core/") }
sensitive_path(p) { startswith(p, "ops/") }
sensitive_path(p) { startswith(p, ".github/workflows/") }

# Bloquear si toca paths sensibles sin label critical
deny[msg] {
  some i
  sensitive_path(input.changed_files[i])
  not input.labels[_] == "critical"
  msg := "Tocar rutas sensibles requiere label 'critical' + CODEOWNERS"
}

# Bloquear si hay demasiadas deleciones sin label rollback
deny[msg] {
  input.deletions > 25
  not input.labels[_] == "rollback"
  msg := "Deleciones masivas requieren label 'rollback' + CODEOWNERS"
}

# Bloquear si hay APIs peligrosas sin justificación
deny[msg] {
  input.dangerous_apis[_]
  not input.labels[_] == "security"
  msg := "APIs peligrosas requieren label 'security' + revisión especializada"
}

# Bloquear si hay cambios en CODEOWNERS sin aprobación
deny[msg] {
  input.changed_files[_] == ".github/CODEOWNERS"
  not input.labels[_] == "governance"
  msg := "Cambios en CODEOWNERS requieren label 'governance' + aprobación de mantenedores"
}

# Bloquear si hay cambios en workflows sin aprobación
deny[msg] {
  some i
  startswith(input.changed_files[i], ".github/workflows/")
  not input.labels[_] == "ci-cd"
  msg := "Cambios en workflows requieren label 'ci-cd' + aprobación de SRE"
}
