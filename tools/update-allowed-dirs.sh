#!/bin/bash
# tools/update-allowed-dirs.sh
# Actualiza automáticamente la lista de directorios permitidos

set -euo pipefail

echo "🔧 Actualizando lista de directorios permitidos..."

# Obtener todos los directorios existentes
EXISTING_DIRS=$(find . -maxdepth 1 -type d -not -name '.' | sed 's|^\./||' | sort)

# Crear nueva lista de directorios permitidos
cat > /tmp/allowed_dirs.txt << 'EOF'
ALLOWED_DIRS=(
EOF

for dir in $EXISTING_DIRS; do
    echo "    \"$dir\"" >> /tmp/allowed_dirs.txt
done

echo ")" >> /tmp/allowed_dirs.txt

# Reemplazar en el archivo de validación
python3 -c "
import re

# Leer el archivo
with open('tools/validate-structure.sh', 'r') as f:
    content = f.read()

# Leer la nueva lista
with open('/tmp/allowed_dirs.txt', 'r') as f:
    new_dirs = f.read()

# Reemplazar la sección ALLOWED_DIRS
pattern = r'ALLOWED_DIRS=\([^)]*\)'
replacement = new_dirs.strip()
new_content = re.sub(pattern, replacement, content, flags=re.DOTALL)

# Escribir el archivo actualizado
with open('tools/validate-structure.sh', 'w') as f:
    f.write(new_content)
"

# Limpiar archivos temporales
rm -f /tmp/allowed_dirs.txt tools/validate-structure.sh.bak

echo "✅ Lista de directorios actualizada"
echo ""
echo "📋 Directorios detectados:"
for dir in $EXISTING_DIRS; do
    echo "  - $dir"
done
