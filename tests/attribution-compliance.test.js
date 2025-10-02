// tests/attribution-compliance.test.js
const AttributionManager = require('../core/attribution-manager');
const fs = require('fs');
const path = require('path');

describe('Attribution Compliance', () => {
  let attributionManager;

  beforeEach(() => {
    attributionManager = new AttributionManager();
  });

  describe('AttributionManager', () => {
    test('should initialize with required attributions', () => {
      expect(attributionManager.attributions.size).toBeGreaterThan(0);
      
      // Verificar que tiene atribuciones requeridas
      const required = Array.from(attributionManager.attributions.values())
        .filter(attr => attr.required);
      
      expect(required.length).toBeGreaterThan(0);
    });

    test('should have all required MCP attributions', () => {
      const requiredKeys = [
        'mcp-agent',
        'github-mcp-server',
        'mcp-github-trending',
        'remote-mcp-functions',
        'mcp-agent-connector',
        'ref-mcp-server',
        'git-mcp-server',
        'mcp-bridge'
      ];

      requiredKeys.forEach(key => {
        expect(attributionManager.attributions.has(key)).toBe(true);
        const attribution = attributionManager.attributions.get(key);
        expect(attribution.required).toBe(true);
        expect(attribution.repository).toBeDefined();
        expect(attribution.license).toBeDefined();
        expect(attribution.text).toBeDefined();
      });
    });

    test('should generate valid attribution report', () => {
      const report = attributionManager.generateAttributionReport();
      
      expect(report.title).toBe('Atribuciones de Dependencias MCP');
      expect(report.generated).toBeDefined();
      expect(report.required).toBeInstanceOf(Array);
      expect(report.recommended).toBeInstanceOf(Array);
      expect(report.summary.total).toBeGreaterThan(0);
      expect(report.summary.required).toBeGreaterThan(0);
    });

    test('should generate valid license file', () => {
      const licenseText = attributionManager.generateLicenseFile();
      
      expect(licenseText).toContain('# Licencias de Dependencias MCP');
      expect(licenseText).toContain('MIT License');
      expect(licenseText).toContain('mcp-agent');
      expect(licenseText).toContain('github-repos-manager-mcp');
    });

    test('should generate valid attributions markdown', () => {
      const markdown = attributionManager.generateAttributionsMarkdown();
      
      expect(markdown).toContain('# Atribuciones de Dependencias MCP');
      expect(markdown).toContain('## mcp-agent Framework');
      expect(markdown).toContain('## GitHub MCP Server');
      expect(markdown).toContain('Licencias Permisivas');
    });
  });

  describe('File Operations', () => {
    const testDir = path.join(__dirname, 'temp');
    
    beforeEach(() => {
      // Crear directorio temporal para tests
      if (!fs.existsSync(testDir)) {
        fs.mkdirSync(testDir, { recursive: true });
      }
    });

    afterEach(() => {
      // Limpiar archivos temporales
      if (fs.existsSync(testDir)) {
        fs.rmSync(testDir, { recursive: true, force: true });
      }
    });

    test('should save attributions file', () => {
      const filePath = path.join(testDir, 'ATTRIBUTIONS.md');
      const savedPath = attributionManager.saveAttributionsFile(filePath);
      
      expect(savedPath).toBe(filePath);
      expect(fs.existsSync(filePath)).toBe(true);
      
      const content = fs.readFileSync(filePath, 'utf8');
      expect(content).toContain('# Atribuciones de Dependencias MCP');
      expect(content).toContain('mcp-agent');
    });

    test('should save license file', () => {
      const filePath = path.join(testDir, 'LICENSES.md');
      const savedPath = attributionManager.saveLicenseFile(filePath);
      
      expect(savedPath).toBe(filePath);
      expect(fs.existsSync(filePath)).toBe(true);
      
      const content = fs.readFileSync(filePath, 'utf8');
      expect(content).toContain('# Licencias de Dependencias MCP');
      expect(content).toContain('MIT License');
    });

    test('should save report file', () => {
      const filePath = path.join(testDir, 'attribution-report.json');
      const savedPath = attributionManager.saveReport(filePath);
      
      expect(savedPath).toBe(filePath);
      expect(fs.existsSync(filePath)).toBe(true);
      
      const content = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      expect(content.title).toBe('Atribuciones de Dependencias MCP');
      expect(content.summary.total).toBeGreaterThan(0);
    });
  });

  describe('Validation', () => {
    test('should validate existing ATTRIBUTIONS.md file', () => {
      // Crear archivo temporal para validación
      const tempFile = path.join(__dirname, 'temp-attributions.md');
      attributionManager.saveAttributionsFile(tempFile);
      
      const validation = attributionManager.validateAttributionsFile(tempFile);
      
      expect(validation.valid).toBe(true);
      expect(validation.coverage).toBe(100);
      expect(validation.missing).toHaveLength(0);
      
      // Limpiar archivo temporal
      fs.unlinkSync(tempFile);
    });

    test('should detect missing attributions', () => {
      // Crear archivo incompleto
      const tempFile = path.join(__dirname, 'incomplete-attributions.md');
      const incompleteContent = `# Atribuciones de Dependencias MCP

## mcp-agent Framework
- **Repositorio**: https://docs.mcp-agent.com
- **Licencia**: MIT License
- **Atribución**: Este proyecto utiliza mcp-agent.

`;
      
      fs.writeFileSync(tempFile, incompleteContent);
      
      const validation = attributionManager.validateAttributionsFile(tempFile);
      
      expect(validation.valid).toBe(false);
      expect(validation.coverage).toBeLessThan(100);
      expect(validation.missing.length).toBeGreaterThan(0);
      
      // Limpiar archivo temporal
      fs.unlinkSync(tempFile);
    });

    test('should handle missing file gracefully', () => {
      const validation = attributionManager.validateAttributionsFile('nonexistent-file.md');
      
      expect(validation.valid).toBe(false);
      expect(validation.error).toBeDefined();
      expect(validation.coverage).toBe(0);
    });
  });

  describe('Integration Tests', () => {
    test('should have ATTRIBUTIONS.md file in project root', () => {
      const attributionsPath = path.join(__dirname, '..', 'ATTRIBUTIONS.md');
      expect(fs.existsSync(attributionsPath)).toBe(true);
      
      const content = fs.readFileSync(attributionsPath, 'utf8');
      expect(content).toContain('# Atribuciones de Dependencias MCP');
      expect(content).toContain('mcp-agent');
      expect(content).toContain('github-repos-manager-mcp');
    });

    test('should validate project ATTRIBUTIONS.md file', () => {
      const attributionsPath = path.join(__dirname, '..', 'ATTRIBUTIONS.md');
      const validation = attributionManager.validateAttributionsFile(attributionsPath);
      
      expect(validation.valid).toBe(true);
      expect(validation.coverage).toBeGreaterThanOrEqual(80); // Al menos 80% de cobertura
    });

    test('should have verify-attributions.sh script', () => {
      const scriptPath = path.join(__dirname, '..', 'scripts', 'verify-attributions.sh');
      expect(fs.existsSync(scriptPath)).toBe(true);
      
      // Verificar que el script es ejecutable
      const stats = fs.statSync(scriptPath);
      expect(stats.mode & parseInt('111', 8)).toBeGreaterThan(0);
    });
  });

  describe('Summary Statistics', () => {
    test('should have correct summary statistics', () => {
      const report = attributionManager.generateAttributionReport();
      
      expect(report.summary.total).toBeGreaterThan(8); // Al menos 8 atribuciones
      expect(report.summary.required).toBeGreaterThan(5); // Al menos 5 requeridas
      expect(report.summary.mitLicenses).toBeGreaterThan(5); // Al menos 5 licencias MIT
      expect(report.summary.githubRepos).toBeGreaterThan(3); // Al menos 3 repos GitHub
    });

    test('should categorize attributions correctly', () => {
      const report = attributionManager.generateAttributionReport();
      
      // Verificar que las categorías suman el total
      expect(report.summary.required + report.summary.recommended).toBe(report.summary.total);
      
      // Verificar que hay atribuciones en ambas categorías
      expect(report.required.length).toBeGreaterThan(0);
      expect(report.recommended.length).toBeGreaterThan(0);
    });
  });
});
