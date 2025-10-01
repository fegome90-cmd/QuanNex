#!/usr/bin/env node
/**
 * @fileoverview Real Test Runner
 * @description Sistema de testing real usando MCP tools para validar funcionalidad
 * Fase 3: Testing Real - Tests con archivos reales, integración, casos límite
 */

import { BaseCorrectionTool, createCommonCLI } from './base-correction-tool.mjs';
import { writeFileSync, readFileSync, existsSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PROJECT_ROOT = join(__dirname, '..');

// Configuración CLI
const argv = createCommonCLI('Uso: $0 [opciones]', {
  'test-files-dir': {
    alias: 'f',
    type: 'string',
    description: 'Directorio de archivos de prueba',
    default: './test-files'
  },
  'test-scenarios': {
    alias: 's',
    type: 'array',
    description: 'Escenarios de prueba a ejecutar',
    default: ['eslint', 'prettier', 'console-removal', 'var-to-const']
  }
}).argv;

class RealTestRunner extends BaseCorrectionTool {
  constructor() {
    super({
      targetPath: argv.targetPath,
      verbose: argv.verbose,
      dryRun: argv.dryRun,
      backup: argv.backup,
      maxConcurrent: argv.maxConcurrent,
      retryAttempts: argv.retryAttempts,
      retryDelay: argv.retryDelay
    });
    
    this.testFilesDir = argv.testFilesDir;
    this.testScenarios = argv.testScenarios;
    this.testResults = [];
    this.testFiles = [];
  }

  /**
   * Ejecutar suite de tests reales
   */
  async run() {
    try {
      this.log('Iniciando Real Test Runner...');
      
      // Paso 1: Preparar archivos de prueba
      await this.prepareTestFiles();
      
      // Paso 2: Ejecutar escenarios de prueba
      await this.runTestScenarios();
      
      // Paso 3: Validar resultados
      await this.validateResults();
      
      // Paso 4: Generar reporte de testing
      await this.generateTestReport();
      
      this.log('Real Test Runner completado exitosamente', 'success');
      
    } catch (error) {
      this.log(`Error en Real Test Runner: ${error.message}`, 'error');
      throw error;
    }
  }

  /**
   * Preparar archivos de prueba
   */
  async prepareTestFiles() {
    this.log('Preparando archivos de prueba...');
    
    if (!existsSync(this.testFilesDir)) {
      throw new Error(`Directorio de archivos de prueba no encontrado: ${this.testFilesDir}`);
    }

    // Listar archivos de prueba
    const fs = await import('node:fs');
    const files = fs.readdirSync(this.testFilesDir);
    this.testFiles = files.filter(file => file.endsWith('.js'));
    
    this.log(`Encontrados ${this.testFiles.length} archivos de prueba`);
    
    // Crear backups de archivos originales
    for (const file of this.testFiles) {
      const filePath = join(this.testFilesDir, file);
      const backupPath = await this.createBackup(filePath);
      if (backupPath) {
        this.verbose(`Backup creado para: ${file}`);
      }
    }
  }

  /**
   * Ejecutar escenarios de prueba
   */
  async runTestScenarios() {
    this.log(`Ejecutando ${this.testScenarios.length} escenarios de prueba...`);
    
    for (const scenario of this.testScenarios) {
      await this.runTestScenario(scenario);
    }
  }

  /**
   * Ejecutar escenario de prueba individual
   */
  async runTestScenario(scenario) {
    this.log(`Ejecutando escenario: ${scenario}`);
    
    const scenarioResults = {
      scenario,
      timestamp: new Date().toISOString(),
      tests: []
    };

    for (const file of this.testFiles) {
      const testResult = await this.runTestOnFile(scenario, file);
      scenarioResults.tests.push(testResult);
    }

    this.testResults.push(scenarioResults);
  }

  /**
   * Ejecutar test en archivo específico
   */
  async runTestOnFile(scenario, file) {
    const filePath = join(this.testFilesDir, file);
    const testResult = {
      file,
      scenario,
      success: false,
      error: null,
      beforeContent: '',
      afterContent: '',
      changes: []
    };

    try {
      // Leer contenido original
      testResult.beforeContent = readFileSync(filePath, 'utf8');
      
      // Ejecutar comando según escenario
      const command = this.getCommandForScenario(scenario, filePath);
      if (command) {
        await this.executeCommandWithRetry(command);
      }
      
      // Leer contenido después del cambio
      testResult.afterContent = readFileSync(filePath, 'utf8');
      
      // Analizar cambios
      testResult.changes = this.analyzeChanges(testResult.beforeContent, testResult.afterContent);
      
      // Validar que el cambio fue aplicado correctamente
      testResult.success = this.validateScenarioResult(scenario, testResult.changes);
      
      if (testResult.success) {
        this.log(`✅ Test exitoso: ${scenario} en ${file}`, 'success');
      } else {
        this.log(`❌ Test fallido: ${scenario} en ${file}`, 'error');
      }
      
    } catch (error) {
      testResult.error = error.message;
      this.log(`❌ Error en test ${scenario} para ${file}: ${error.message}`, 'error');
    }

    return testResult;
  }

  /**
   * Obtener comando para escenario específico
   */
  getCommandForScenario(scenario, filePath) {
    const commands = {
      'eslint': `npx eslint --fix "${filePath}"`,
      'prettier': `npx prettier --write "${filePath}"`,
      'console-removal': `sed -i '' '/console\\.(log|warn|error|info)/d' "${filePath}"`,
      'var-to-const': `sed -i '' 's/var /const /g' "${filePath}"`
    };
    
    return commands[scenario] || null;
  }

  /**
   * Analizar cambios entre contenido antes y después
   */
  analyzeChanges(before, after) {
    const changes = [];
    const beforeLines = before.split('\n');
    const afterLines = after.split('\n');
    
    // Detectar líneas eliminadas
    for (let i = 0; i < beforeLines.length; i++) {
      if (!afterLines[i] || beforeLines[i] !== afterLines[i]) {
        changes.push({
          type: 'modified',
          line: i + 1,
          before: beforeLines[i],
          after: afterLines[i] || '[ELIMINADA]'
        });
      }
    }
    
    // Detectar líneas añadidas
    if (afterLines.length > beforeLines.length) {
      for (let i = beforeLines.length; i < afterLines.length; i++) {
        changes.push({
          type: 'added',
          line: i + 1,
          before: '',
          after: afterLines[i]
        });
      }
    }
    
    return changes;
  }

  /**
   * Validar resultado del escenario
   */
  validateScenarioResult(scenario, changes) {
    switch (scenario) {
      case 'eslint':
        // ESLint debería haber corregido problemas de sintaxis
        return changes.some(change => 
          change.type === 'modified' && 
          (change.after.includes('const ') || change.after.includes(';'))
        );
        
      case 'prettier':
        // Prettier debería haber formateado el código
        return changes.length > 0;
        
      case 'console-removal':
        // Debería haber eliminado console.log
        return changes.some(change => 
          change.type === 'modified' && 
          change.before.includes('console.') && 
          change.after === '[ELIMINADA]'
        );
        
      case 'var-to-const':
        // Debería haber cambiado var por const
        return changes.some(change => 
          change.type === 'modified' && 
          change.before.includes('var ') && 
          change.after.includes('const ')
        );
        
      default:
        return false;
    }
  }

  /**
   * Validar resultados generales
   */
  async validateResults() {
    this.log('Validando resultados de tests...');
    
    let totalTests = 0;
    let successfulTests = 0;
    let failedTests = 0;
    
    for (const scenarioResult of this.testResults) {
      for (const test of scenarioResult.tests) {
        totalTests++;
        if (test.success) {
          successfulTests++;
        } else {
          failedTests++;
        }
      }
    }
    
    const successRate = totalTests > 0 ? (successfulTests / totalTests * 100).toFixed(2) : 0;
    
    this.log(`Validación completada: ${successfulTests}/${totalTests} tests exitosos (${successRate}%)`);
    
    if (failedTests > 0) {
      this.log(`${failedTests} tests fallaron`, 'warn');
    }
  }

  /**
   * Generar reporte de testing
   */
  async generateTestReport() {
    const report = this.generateBaseReport('real_test_runner', {
      test_files_dir: this.testFilesDir,
      test_scenarios: this.testScenarios,
      test_files_count: this.testFiles.length,
      total_scenarios: this.testResults.length,
      total_tests: this.testResults.reduce((sum, sr) => sum + sr.tests.length, 0),
      successful_tests: this.testResults.reduce((sum, sr) => 
        sum + sr.tests.filter(t => t.success).length, 0),
      failed_tests: this.testResults.reduce((sum, sr) => 
        sum + sr.tests.filter(t => !t.success).length, 0),
      test_results: this.testResults
    });

    const filename = `real-test-runner-${Date.now()}.json`;
    await this.saveReport(report, filename);
    
    this.log(`Reporte de testing generado: ${filename}`, 'success');
  }
}

// Ejecutar test runner si se llama directamente
if (import.meta.url === `file://${__filename}`) {
  const runner = new RealTestRunner();
  runner.run().catch(error => {
    console.error('❌ Error fatal:', error.message);
    process.exit(1);
  });
}

export default RealTestRunner;
