#!/bin/bash
# scripts/verify-attributions.sh
# Script para verificar que todas las atribuciones requeridas estén presentes

set -e

echo "=== Verificación de Atribuciones MCP ==="

# Verificar que el archivo ATTRIBUTIONS.md existe
if [ ! -f "ATTRIBUTIONS.md" ]; then
    echo "❌ Archivo ATTRIBUTIONS.md no encontrado"
    exit 1
fi

echo "✅ Archivo ATTRIBUTIONS.md encontrado"

# Verificar que las atribuciones requeridas estén presentes
required_attributions=(
    "mcp-agent"
    "github-repos-manager-mcp"
    "mcp-github-trending"
    "remote-mcp-functions"
    "mcp-agent-connector"
    "Ref MCP Server"
    "Git MCP Server"
    "MCP Bridge"
)

missing_attributions=()

for attribution in "${required_attributions[@]}"; do
    if grep -qi "$attribution" ATTRIBUTIONS.md; then
        echo "✅ Atribución encontrada: $attribution"
    else
        echo "❌ Atribución faltante: $attribution"
        missing_attributions+=("$attribution")
    fi
done

# Verificar que no hay atribuciones faltantes
if [ ${#missing_attributions[@]} -eq 0 ]; then
    echo "✅ Todas las atribuciones requeridas están presentes"
else
    echo "❌ Atribuciones faltantes: ${missing_attributions[*]}"
    exit 1
fi

# Verificar que se mencionan las licencias MIT
if grep -qi "MIT License" ATTRIBUTIONS.md; then
    echo "✅ Licencias MIT mencionadas"
else
    echo "❌ Licencias MIT no mencionadas"
    exit 1
fi

# Verificar que se mencionan los repositorios
if grep -qi "github.com" ATTRIBUTIONS.md; then
    echo "✅ Repositorios GitHub mencionados"
else
    echo "❌ Repositorios GitHub no mencionados"
    exit 1
fi

# Generar reporte de licencias si Node.js está disponible
if command -v node &> /dev/null; then
    echo "📄 Generando reporte de atribuciones..."
    
    # Crear script temporal para generar reporte
    cat > temp_attribution_report.cjs << 'EOF'
const fs = require('fs');

// Leer el archivo ATTRIBUTIONS.md
const content = fs.readFileSync('ATTRIBUTIONS.md', 'utf8');

// Extraer información de atribuciones
const attributions = [];
const lines = content.split('\n');

let currentAttribution = {};
let inAttributionSection = false;

for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    if (line.startsWith('## ') && !line.includes('Licencias Permisivas')) {
        if (currentAttribution.name) {
            attributions.push(currentAttribution);
        }
        currentAttribution = {
            name: line.replace('## ', ''),
            repository: '',
            license: '',
            attribution: ''
        };
        inAttributionSection = true;
    } else if (inAttributionSection && line.startsWith('- **Repositorio**:')) {
        currentAttribution.repository = line.replace('- **Repositorio**: ', '');
    } else if (inAttributionSection && line.startsWith('- **Licencia**:')) {
        currentAttribution.license = line.replace('- **Licencia**: ', '');
    } else if (inAttributionSection && line.startsWith('- **Atribución**:')) {
        currentAttribution.attribution = line.replace('- **Atribución**: ', '');
    } else if (line.startsWith('---') && inAttributionSection) {
        inAttributionSection = false;
    }
}

// Agregar la última atribución
if (currentAttribution.name) {
    attributions.push(currentAttribution);
}

// Generar reporte
const report = {
    title: 'Reporte de Atribuciones MCP',
    generated: new Date().toISOString(),
    totalAttributions: attributions.length,
    attributions: attributions,
    summary: {
        mitLicenses: attributions.filter(a => a.license.includes('MIT')).length,
        githubRepos: attributions.filter(a => a.repository.includes('github.com')).length,
        pypiRepos: attributions.filter(a => a.repository.includes('pypi.org')).length
    }
};

console.log(JSON.stringify(report, null, 2));
EOF

    # Ejecutar el script y guardar el reporte
    node temp_attribution_report.cjs > attribution-report.json
    rm temp_attribution_report.cjs
    
    echo "📄 Reporte de atribuciones generado: attribution-report.json"
else
    echo "⚠️  Node.js no disponible, saltando generación de reporte"
fi

echo ""
echo "=== Resumen de Verificación ==="
echo "✅ Archivo ATTRIBUTIONS.md presente"
echo "✅ Todas las atribuciones requeridas verificadas"
echo "✅ Licencias MIT identificadas"
echo "✅ Repositorios GitHub verificados"
echo ""
echo "🎉 Verificación de atribuciones completada exitosamente"
