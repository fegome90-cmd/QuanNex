package pr

# Función para verificar si tiene una label específica
has_label(l) {
  input.labels[_] == l
}

# Ajusta el límite si quieres alinear con config/sensitive-paths.yaml
max_files_deleted := 25

# Función para verificar si un archivo es sensible
is_sensitive[p] {
  p := input.files[_]
  startswith(p, "rag/")
} 
is_sensitive[p] {
  p := input.files[_]
  startswith(p, ".github/workflows/")
}
is_sensitive[p] {
  p := input.files[_]
  startswith(p, "ops/")
}
is_sensitive[p] {
  p := input.files[_]
  startswith(p, "core/")
}

# Regla 1: rutas sensibles
deny[msg] {
  count(is_sensitive) > 0
  not has_label("critical")
  msg := "Tocar rutas sensibles requiere label 'critical' + CODEOWNERS"
}

# Regla 2: deleciones masivas
deny[msg] {
  count(input.deleted_files) > max_files_deleted
  not has_label("rollback")
  msg := sprintf("Deleciones masivas (%d > %d) requieren 'rollback' + CODEOWNERS", [count(input.deleted_files), max_files_deleted])
}
