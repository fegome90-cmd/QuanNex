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
      attribution: '',
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
    pypiRepos: attributions.filter(a => a.repository.includes('pypi.org')).length,
  },
};

console.log(JSON.stringify(report, null, 2));
