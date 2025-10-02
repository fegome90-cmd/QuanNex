// core/attribution-manager.js
const fs = require('fs');
const path = require('path');

class AttributionManager {
  constructor() {
    this.attributions = new Map();
    this.loadAttributions();
  }

  loadAttributions() {
    // Atribuciones requeridas por licencias MIT
    this.attributions.set('mcp-agent', {
      name: 'mcp-agent Framework',
      repository: 'https://docs.mcp-agent.com',
      license: 'MIT',
      required: true,
      text: 'Este proyecto utiliza mcp-agent, un framework para construir agentes de IA compatibles con MCP.'
    });

    this.attributions.set('github-mcp-server', {
      name: 'GitHub MCP Server',
      repository: 'https://github.com/kurdin/github-repos-manager-mcp',
      license: 'MIT',
      required: true,
      text: 'GitHub MCP Server desarrollado por kurdin'
    });

    this.attributions.set('mcp-github-trending', {
      name: 'MCP-GitHub-Trending',
      repository: 'https://github.com/hetaoBackend/mcp-github-trending',
      license: 'MIT',
      required: true,
      text: 'MCP-GitHub-Trending desarrollado por hetaoBackend'
    });

    this.attributions.set('remote-mcp-functions', {
      name: 'Remote MCP Functions - Azure Samples',
      repository: 'https://github.com/Azure-Samples/remote-mcp-functions',
      license: 'MIT',
      required: true,
      text: 'Remote MCP Functions - Azure Samples'
    });

    this.attributions.set('mcp-agent-connector', {
      name: 'mcp-agent-connector',
      repository: 'https://pypi.org/project/mcp-agent-connector',
      license: 'MIT',
      required: true,
      text: 'mcp-agent-connector para auto-descubrimiento de servidores MCP'
    });

    this.attributions.set('ref-mcp-server', {
      name: 'Ref MCP Server',
      repository: 'https://mcp.so/server/ref/ref-tools',
      license: 'MIT',
      required: true,
      text: 'Ref MCP Server para documentación actualizada de LLMs y agentes'
    });

    this.attributions.set('git-mcp-server', {
      name: 'Git MCP Server',
      repository: 'https://mcpmarket.com/server/git-3',
      license: 'MIT',
      required: true,
      text: 'Git MCP Server para operaciones Git completas'
    });

    this.attributions.set('mcp-bridge', {
      name: 'MCP Bridge',
      repository: 'https://arxiv.org/abs/2504.08999',
      license: 'MIT',
      required: true,
      text: 'MCP Bridge - Proxy RESTful para servidores MCP'
    });

    // Atribuciones recomendadas pero no obligatorias
    this.attributions.set('microsoft-learn', {
      name: 'Microsoft Learn - Azure AI Agents',
      repository: 'https://learn.microsoft.com/en-us/training/modules/connect-agent-to-mcp-tools',
      license: 'Microsoft Documentation License',
      required: false,
      text: 'Documentación oficial de Microsoft para integración de agentes Azure AI con MCP'
    });

    this.attributions.set('agency-swarm', {
      name: 'Agency Swarm',
      repository: 'https://agency-swarm.ai/core-framework/tools/mcp-integration',
      license: 'Apache 2.0',
      required: false,
      text: 'Agency Swarm framework para integración MCP'
    });

    this.attributions.set('eggai', {
      name: 'EggAI Integration',
      repository: 'https://docs.egg-ai.com/examples/mcp',
      license: 'MIT',
      required: false,
      text: 'EggAI framework para ejemplos de integración MCP'
    });

    this.attributions.set('agenticgokit', {
      name: 'AgenticGoKit',
      repository: 'https://docs.agenticgokit.com/reference/api/mcp',
      license: 'MIT',
      required: false,
      text: 'AgenticGoKit para integración MCP'
    });
  }

  generateAttributionReport() {
    const report = {
      title: 'Atribuciones de Dependencias MCP',
      generated: new Date().toISOString(),
      required: [],
      recommended: [],
      summary: {
        total: this.attributions.size,
        required: 0,
        recommended: 0,
        mitLicenses: 0,
        githubRepos: 0,
        pypiRepos: 0
      }
    };

    for (const [, attribution] of this.attributions) {
      if (attribution.required) {
        report.required.push(attribution);
        report.summary.required++;
      } else {
        report.recommended.push(attribution);
        report.summary.recommended++;
      }

      // Contar tipos de licencias y repositorios
      if (attribution.license.includes('MIT')) {
        report.summary.mitLicenses++;
      }
      if (attribution.repository.includes('github.com')) {
        report.summary.githubRepos++;
      }
      if (attribution.repository.includes('pypi.org')) {
        report.summary.pypiRepos++;
      }
    }

    return report;
  }

  generateLicenseFile() {
    const required = Array.from(this.attributions.values())
      .filter(attr => attr.required);

    let licenseText = `# Licencias de Dependencias MCP

Este proyecto utiliza las siguientes dependencias que requieren atribución según sus licencias:

`;

    required.forEach(attr => {
      licenseText += `## ${attr.name}
- Repositorio: ${attr.repository}
- Licencia: ${attr.license}
- Atribución: ${attr.text}

`;
    });

    licenseText += `---

**Nota**: Todas las dependencias listadas utilizan licencias MIT, que requieren la inclusión del aviso de copyright y la lista de condiciones de la licencia en todas las copias o partes sustanciales del software.

**Última actualización**: ${new Date().toISOString()}
**Versión**: 1.0.0`;

    return licenseText;
  }

  generateAttributionsMarkdown() {
    const required = Array.from(this.attributions.values())
      .filter(attr => attr.required);
    const recommended = Array.from(this.attributions.values())
      .filter(attr => !attr.required);

    let markdown = `# Atribuciones de Dependencias MCP

Este proyecto utiliza las siguientes dependencias que requieren atribución según sus licencias:

`;

    // Atribuciones requeridas
    required.forEach(attr => {
      markdown += `## ${attr.name}
- **Repositorio**: ${attr.repository}
- **Licencia**: ${attr.license}
- **Atribución**: ${attr.text}

`;
    });

    markdown += `---

## Licencias Permisivas (Sin Atribución Obligatoria)

`;

    // Atribuciones recomendadas
    recommended.forEach(attr => {
      markdown += `### ${attr.name}
- **Documentación**: ${attr.repository}
- **Licencia**: ${attr.license}
- **Atribución**: ${attr.text}
- **Nota**: ${attr.required ? 'Requerida' : 'Recomendada pero no obligatoria'}

`;
    });

    markdown += `---

**Última actualización**: ${new Date().toISOString()}
**Versión**: 1.0.0`;

    return markdown;
  }

  validateAttributionsFile(filePath = 'ATTRIBUTIONS.md') {
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      const required = Array.from(this.attributions.values())
        .filter(attr => attr.required);

      const missing = [];
      const present = [];

      required.forEach(attr => {
        const normalizedName = attr.name.toLowerCase().replace(/\s+/g, '-');
        if (content.toLowerCase().includes(normalizedName) || 
            content.toLowerCase().includes(attr.name.toLowerCase())) {
          present.push(attr.name);
        } else {
          missing.push(attr.name);
        }
      });

      return {
        valid: missing.length === 0,
        present,
        missing,
        total: required.length,
        coverage: (present.length / required.length) * 100
      };
    } catch (error) {
      return {
        valid: false,
        error: error.message,
        present: [],
        missing: [],
        total: 0,
        coverage: 0
      };
    }
  }

  saveAttributionsFile(filePath = 'ATTRIBUTIONS.md') {
    const content = this.generateAttributionsMarkdown();
    fs.writeFileSync(filePath, content, 'utf8');
    return filePath;
  }

  saveLicenseFile(filePath = 'LICENSES.md') {
    const content = this.generateLicenseFile();
    fs.writeFileSync(filePath, content, 'utf8');
    return filePath;
  }

  saveReport(filePath = 'attribution-report.json') {
    const report = this.generateAttributionReport();
    fs.writeFileSync(filePath, JSON.stringify(report, null, 2), 'utf8');
    return filePath;
  }
}

module.exports = AttributionManager;

// Si se ejecuta directamente, generar archivos
if (require.main === module) {
  const manager = new AttributionManager();
  
  console.log('Generando archivos de atribución...');
  
  const attributionsFile = manager.saveAttributionsFile();
  console.log(`✅ Archivo de atribuciones creado: ${attributionsFile}`);
  
  const licenseFile = manager.saveLicenseFile();
  console.log(`✅ Archivo de licencias creado: ${licenseFile}`);
  
  const reportFile = manager.saveReport();
  console.log(`✅ Reporte generado: ${reportFile}`);
  
  // Validar archivo de atribuciones
  const validation = manager.validateAttributionsFile();
  if (validation.valid) {
    console.log(`✅ Validación exitosa: ${validation.coverage.toFixed(1)}% de cobertura`);
  } else {
    console.log(`❌ Validación fallida: ${validation.missing.join(', ')}`);
  }
}
