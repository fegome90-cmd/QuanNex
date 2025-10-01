#!/usr/bin/env node
/**
 * @fileoverview Smart Test Runner
 * @description Sistema de testing inteligente que detecta el estado actual de los archivos
 * Optimización con MCP: Testing adaptativo y inteligente
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
  'adaptive-testing': {
    alias: 'a',
    type: 'boolean',
    description: 'Habilitar testing adaptativo',
    default: true
  }
}).argv;

class SmartTestRunner extends BaseCorrectionTool {
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
    this.adaptiveTesting = argv.adaptiveTesting;
    this.testResults = [];
    this.testFiles = [];
    this.fileAnalysis = new Map();
  }

  /**
   * Ejecutar suite de tests inteligentes
   */
  async run() {
    try {
      this.log('Iniciando Smart Test Runner...');
      
      // Paso 1: Preparar archivos de prueba
      await this.prepareTestFiles();
      
      // Paso 2: Analizar estado actual de los archivos
      await this.analyzeFileStates();
      
      // Paso 3: Generar tests adaptativos
      await this.generateAdaptiveTests();
      
      // Paso 4: Ejecutar tests adaptativos
      await this.runAdaptiveTests();
      
      // Paso 5: Generar reporte inteligente
      await this.generateSmartReport();
      
      this.log('Smart Test Runner completado exitosamente', 'success');
      
    } catch (error) {
      this.log(`Error en Smart Test Runner: ${error.message}`, 'error');
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

    const fs = await import('node:fs');
    const files = fs.readdirSync(this.testFilesDir);
    this.testFiles = files.filter(file => file.endsWith('.js'));
    
    this.log(`Encontrados ${this.testFiles.length} archivos de prueba`);
  }

  /**
   * Analizar estado actual de los archivos
   */
  async analyzeFileStates() {
    this.log('Analizando estado actual de los archivos...');
    
    for (const file of this.testFiles) {
      const filePath = join(this.testFilesDir, file);
      const content = readFileSync(filePath, 'utf8');
      
      const analysis = {
        file,
        path: filePath,
        hasVarDeclarations: /var\s+\w+/.test(content),
        hasConsoleStatements: /console\.(log|warn|error|info)/.test(content),
        hasInconsistentQuotes: /"[^"]*"|'[^']*'/.test(content) && /"[^"]*"|'[^']*'/.test(content),
        hasMissingSemicolons: /[^;]\s*$/.test(content.split('\n').filter(line => line.trim() && !line.trim().startsWith('//')).join('\n')),
        needsPrettier: this.needsPrettierFormatting(content),
        needsESLint: this.needsESLintFixes(content),
        lineCount: content.split('\n').length,
        complexity: this.calculateComplexity(content)
      };
      
      this.fileAnalysis.set(file, analysis);
      
      if (this.config.verbose) {
        this.verbose(`Análisis de ${file}:`, analysis);
      }
    }
  }

  /**
   * Detectar si el archivo necesita formateo de Prettier
   */
  needsPrettierFormatting(content) {
    const lines = content.split('\n');
    return lines.some(line => {
      const trimmed = line.trim();
      return trimmed.includes('{') && !trimmed.includes(' ') ||
             trimmed.includes('=') && !trimmed.includes(' ') ||
             trimmed.includes('(') && !trimmed.includes(' ');
    });
  }

  /**
   * Detectar si el archivo necesita correcciones de ESLint
   */
  needsESLintFixes(content) {
    return /var\s+\w+/.test(content) ||
           /console\.(log|warn|error|info)/.test(content) ||
           /[^;]\s*$/.test(content.split('\n').filter(line => line.trim() && !line.trim().startsWith('//')).join('\n'));
  }

  /**
   * Calcular complejidad del archivo
   */
  calculateComplexity(content) {
    const lines = content.split('\n');
    let complexity = 0;
    
    // Contar funciones
    complexity += (content.match(/function\s+\w+/g) || []).length;
    
    // Contar loops
    complexity += (content.match(/for\s*\(|while\s*\(|do\s*{/g) || []).length;
    
    // Contar condicionales
    complexity += (content.match(/if\s*\(|switch\s*\(/g) || []).length;
    
    // Contar líneas de código (no vacías, no comentarios)
    const codeLines = lines.filter(line => 
      line.trim() && 
      !line.trim().startsWith('//') && 
      !line.trim().startsWith('*')
    ).length;
    
    return {
      functions: (content.match(/function\s+\w+/g) || []).length,
      loops: (content.match(/for\s*\(|while\s*\(|do\s*{/g) || []).length,
      conditionals: (content.match(/if\s*\(|switch\s*\(/g) || []).length,
      codeLines,
      totalComplexity: complexity + codeLines
    };
  }

  /**
   * Generar tests adaptativos basados en el análisis
   */
  async generateAdaptiveTests() {
    this.log('Generando tests adaptativos...');
    
    const adaptiveTests = [];
    
    for (const [file, analysis] of this.fileAnalysis) {
      const fileTests = [];
      
      // Test de Prettier solo si es necesario
      if (analysis.needsPrettier) {
        fileTests.push({
          name: 'prettier-formatting',
          description: 'Formateo con Prettier',
          command: `npx prettier --write "${analysis.path}"`,
          expectedChange: true
        });
      } else {
        fileTests.push({
          name: 'prettier-formatting',
          description: 'Formateo con Prettier (ya formateado)',
          command: `npx prettier --write "${analysis.path}"`,
          expectedChange: false,
          skipReason: 'Archivo ya está formateado correctamente'
        });
      }
      
      // Test de ESLint solo si es necesario
      if (analysis.needsESLint) {
        fileTests.push({
          name: 'eslint-fixes',
          description: 'Correcciones con ESLint',
          command: `npx eslint --fix "${analysis.path}"`,
          expectedChange: true
        });
      } else {
        fileTests.push({
          name: 'eslint-fixes',
          description: 'Correcciones con ESLint (ya corregido)',
          command: `npx eslint --fix "${analysis.path}"`,
          expectedChange: false,
          skipReason: 'Archivo ya cumple con las reglas de ESLint'
        });
      }
      
      // Test de console removal solo si hay console statements
      if (analysis.hasConsoleStatements) {
        fileTests.push({
          name: 'console-removal',
          description: 'Eliminación de console statements',
          command: `sed -i '' '/console\\.(log|warn|error|info)/d' "${analysis.path}"`,
          expectedChange: true
        });
      } else {
        fileTests.push({
          name: 'console-removal',
          description: 'Eliminación de console statements (no hay)',
          command: `sed -i '' '/console\\.(log|warn|error|info)/d' "${analysis.path}"`,
          expectedChange: false,
          skipReason: 'No hay console statements para eliminar'
        });
      }
      
      // Test de var-to-const solo si hay var declarations
      if (analysis.hasVarDeclarations) {
        fileTests.push({
          name: 'var-to-const',
          description: 'Cambio de var a const',
          command: `sed -i '' 's/var /const /g' "${analysis.path}"`,
          expectedChange: true
        });
      } else {
        fileTests.push({
          name: 'var-to-const',
          description: 'Cambio de var a const (no hay var)',
          command: `sed -i '' 's/var /const /g' "${analysis.path}"`,
          expectedChange: false,
          skipReason: 'No hay declaraciones var para cambiar'
        });
      }
      
      adaptiveTests.push({
        file,
        analysis,
        tests: fileTests
      });
    }
    
    this.adaptiveTests = adaptiveTests;
    this.log(`Generados ${adaptiveTests.length} conjuntos de tests adaptativos`);
  }

  /**
   * Ejecutar tests adaptativos
   */
  async runAdaptiveTests() {
    this.log('Ejecutando tests adaptativos...');
    
    for (const fileTest of this.adaptiveTests) {
      this.log(`Procesando archivo: ${fileTest.file}`);
      
      const fileResults = {
        file: fileTest.file,
        analysis: fileTest.analysis,
        tests: []
      };
      
      for (const test of fileTest.tests) {
        const testResult = await this.runAdaptiveTest(test, fileTest.file);
        fileResults.tests.push(testResult);
      }
      
      this.testResults.push(fileResults);
    }
  }

  /**
   * Ejecutar test adaptativo individual
   */
  async runAdaptiveTest(test, file) {
    const testResult = {
      name: test.name,
      description: test.description,
      expectedChange: test.expectedChange,
      skipReason: test.skipReason,
      success: false,
      error: null,
      actualChange: false,
      beforeContent: '',
      afterContent: '',
      changes: []
    };

    try {
      // Leer contenido antes del test
      testResult.beforeContent = readFileSync(test.command.split('"')[1], 'utf8');
      
      // Si no se espera cambio, marcar como exitoso
      if (!test.expectedChange && test.skipReason) {
        testResult.success = true;
        testResult.actualChange = false;
        this.log(`⏭️ Test omitido: ${test.description} - ${test.skipReason}`, 'info');
        return testResult;
      }
      
      // Ejecutar comando
      await this.executeCommandWithRetry(test.command);
      
      // Leer contenido después del test
      testResult.afterContent = readFileSync(test.command.split('"')[1], 'utf8');
      
      // Analizar cambios
      testResult.changes = this.analyzeChanges(testResult.beforeContent, testResult.afterContent);
      testResult.actualChange = testResult.changes.length > 0;
      
      // Validar resultado
      if (test.expectedChange) {
        testResult.success = testResult.actualChange;
      } else {
        testResult.success = !testResult.actualChange;
      }
      
      if (testResult.success) {
        this.log(`✅ Test exitoso: ${test.description}`, 'success');
      } else {
        this.log(`❌ Test fallido: ${test.description}`, 'error');
      }
      
    } catch (error) {
      testResult.error = error.message;
      this.log(`❌ Error en test ${test.name} para ${file}: ${error.message}`, 'error');
    }

    return testResult;
  }

  /**
   * Analizar cambios entre contenido antes y después
   */
  analyzeChanges(before, after) {
    const changes = [];
    const beforeLines = before.split('\n');
    const afterLines = after.split('\n');
    
    // Detectar líneas modificadas
    for (let i = 0; i < Math.max(beforeLines.length, afterLines.length); i++) {
      const beforeLine = beforeLines[i] || '';
      const afterLine = afterLines[i] || '';
      
      if (beforeLine !== afterLine) {
        changes.push({
          type: beforeLine === '' ? 'added' : afterLine === '' ? 'removed' : 'modified',
          line: i + 1,
          before: beforeLine,
          after: afterLine
        });
      }
    }
    
    return changes;
  }

  /**
   * Generar reporte inteligente
   */
  async generateSmartReport() {
    let totalTests = 0;
    let successfulTests = 0;
    let skippedTests = 0;
    let failedTests = 0;
    
    for (const fileResult of this.testResults) {
      for (const test of fileResult.tests) {
        totalTests++;
        if (test.skipReason) {
          skippedTests++;
        } else if (test.success) {
          successfulTests++;
        } else {
          failedTests++;
        }
      }
    }
    
    const successRate = totalTests > 0 ? (successfulTests / (totalTests - skippedTests) * 100).toFixed(2) : 0;
    
    const report = this.generateBaseReport('smart_test_runner', {
      adaptive_testing: this.adaptiveTesting,
      total_files: this.testFiles.length,
      total_tests: totalTests,
      successful_tests: successfulTests,
      skipped_tests: skippedTests,
      failed_tests: failedTests,
      success_rate: `${successRate}%`,
      file_analysis: Array.from(this.fileAnalysis.values()),
      test_results: this.testResults
    });

    const filename = `smart-test-runner-${Date.now()}.json`;
    await this.saveReport(report, filename);
    
    this.log(`Reporte inteligente generado: ${filename}`, 'success');
    this.log(`Resumen: ${successfulTests} exitosos, ${skippedTests} omitidos, ${failedTests} fallidos (${successRate}% de éxito)`);
  }
}

// Ejecutar test runner si se llama directamente
if (import.meta.url === `file://${__filename}`) {
  const runner = new SmartTestRunner();
  runner.run().catch(error => {
    console.error('❌ Error fatal:', error.message);
    process.exit(1);
  });
}

export default SmartTestRunner;
