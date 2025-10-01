#!/usr/bin/env node
/**
 * @fileoverview Optimization Agent Server - Sugerencias de refactor y mejoras
 * @description Agente especializado para optimización de código, refactor y mejoras de performance
 */

import { readFileSync, writeFileSync, existsSync, statSync } from 'node:fs';
import { join, dirname, extname } from 'node:path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

class OptimizationAgent {
  constructor() {
    this.optimizations = {
      performance: [],
      maintainability: [],
      readability: [],
      security: []
    };
    this.stats = {
      files_analyzed: 0,
      optimizations_found: 0,
      refactors_suggested: 0,
      performance_improvements: 0
    };
  }

  /**
   * Procesar entrada del agente de optimización
   */
  async process(input) {
    try {
      const {
        target_path,
        optimization_types = ['performance', 'maintainability'],
        scan_depth = 2,
        auto_fix = false
      } = input;

      if (process.env.NODE_ENV !== 'production') {
        console.log(`🔧 Optimization Agent: Analizando ${target_path}...`);
      }

      // Analizar optimizaciones según tipos solicitados
      for (const optType of optimization_types) {
        switch (optType) {
          case 'performance':
            await this.analyzePerformanceOptimizations(target_path, scan_depth);
            break;
          case 'maintainability':
            await this.analyzeMaintainabilityOptimizations(
              target_path,
              scan_depth
            );
            break;
          case 'readability':
            await this.analyzeReadabilityOptimizations(target_path, scan_depth);
            break;
          case 'security':
            await this.analyzeSecurityOptimizations(target_path, scan_depth);
            break;
        }
      }

      // Generar reporte
      const report = this.generateReport();

      // Si auto_fix está habilitado, generar comandos de autofix
      if (auto_fix) {
        report.auto_fix_commands = this.generateAutofixCommands();
      }

      return {
        schema_version: '1.0.0',
        agent_version: '1.0.0',
        optimization_report: report,
        stats: this.stats,
        trace: ['optimization.server:ok']
      };
    } catch (error) {
      return {
        schema_version: '1.0.0',
        agent_version: '1.0.0',
        error: `optimization.server:error:${error.message}`,
        trace: ['optimization.server:error']
      };
    }
  }

  /**
   * Analizar optimizaciones de rendimiento
   */
  async analyzePerformanceOptimizations(targetPath, scanDepth) {
    if (process.env.NODE_ENV !== 'production') {
      console.log('⚡ Analizando optimizaciones de rendimiento...');
    }

    try {
      await this.scanDirectory(targetPath, scanDepth, (filePath, content) => {
        this.analyzeFilePerformance(filePath, content);
      });
    } catch (error) {
      if (process.env.NODE_ENV !== 'production') {
        console.warn(`⚠️ Error analizando rendimiento: ${error.message}`);
      }
    }
  }

  /**
   * Analizar optimizaciones de mantenibilidad
   */
  async analyzeMaintainabilityOptimizations(targetPath, scanDepth) {
    console.log('🔧 Analizando optimizaciones de mantenibilidad...');

    try {
      await this.scanDirectory(targetPath, scanDepth, (filePath, content) => {
        this.analyzeFileMaintainability(filePath, content);
      });
    } catch (error) {
      console.warn(`⚠️ Error analizando mantenibilidad: ${error.message}`);
    }
  }

  /**
   * Analizar optimizaciones de legibilidad
   */
  async analyzeReadabilityOptimizations(targetPath, scanDepth) {
    console.log('📖 Analizando optimizaciones de legibilidad...');

    try {
      await this.scanDirectory(targetPath, scanDepth, (filePath, content) => {
        this.analyzeFileReadability(filePath, content);
      });
    } catch (error) {
      console.warn(`⚠️ Error analizando legibilidad: ${error.message}`);
    }
  }

  /**
   * Analizar optimizaciones de seguridad
   */
  async analyzeSecurityOptimizations(targetPath, scanDepth) {
    console.log('🔒 Analizando optimizaciones de seguridad...');

    try {
      await this.scanDirectory(targetPath, scanDepth, (filePath, content) => {
        this.analyzeFileSecurity(filePath, content);
      });
    } catch (error) {
      console.warn(`⚠️ Error analizando seguridad: ${error.message}`);
    }
  }

  /**
   * Escanear directorio recursivamente
   */
  async scanDirectory(path, depth, callback) {
    if (depth <= 0) return;

    try {
      const entries = await this.readDirectory(path);

      for (const entry of entries) {
        const fullPath = join(path, entry);
        const stat = statSync(fullPath);

        if (stat.isDirectory()) {
          if (
            !['node_modules', '.git', 'dist', 'build', 'coverage'].includes(
              entry
            )
          ) {
            await this.scanDirectory(fullPath, depth - 1, callback);
          }
        } else if (stat.isFile()) {
          const ext = extname(fullPath).toLowerCase();
          if (['.js', '.ts', '.jsx', '.tsx'].includes(ext)) {
            try {
              const content = readFileSync(fullPath, 'utf8');
              callback(fullPath, content);
              this.stats.files_analyzed++;
            } catch (error) {
              console.warn(
                `⚠️ No se pudo analizar ${fullPath}: ${error.message}`
              );
            }
          }
        }
      }
    } catch (error) {
      console.warn(`⚠️ No se pudo escanear ${path}: ${error.message}`);
    }
  }

  /**
   * Leer directorio
   */
  async readDirectory(path) {
    const { readdirSync } = await import('fs');
    return readdirSync(path);
  }

  /**
   * Analizar optimizaciones de rendimiento de archivo
   */
  analyzeFilePerformance(filePath, content) {
    const lines = content.split('\n');

    // Detectar loops ineficientes
    const inefficientLoops =
      content.match(
        /for\s*\(\s*let\s+\w+\s*=\s*0\s*;\s*\w+\s*<\s*array\.length/g
      ) || [];
    if (inefficientLoops.length > 0) {
      this.optimizations.performance.push({
        file: filePath,
        type: 'inefficient_loop',
        line: this.getLineNumber(content, content.indexOf(inefficientLoops[0])),
        suggestion: 'Usar for...of o forEach para mejor rendimiento',
        impact: 'medium',
        effort: 'low'
      });
      this.stats.performance_improvements++;
    }

    // Detectar uso de eval
    const evalUsage = content.match(/eval\s*\(/g) || [];
    if (evalUsage.length > 0) {
      this.optimizations.performance.push({
        file: filePath,
        type: 'eval_usage',
        line: this.getLineNumber(content, content.indexOf(evalUsage[0])),
        suggestion: 'Reemplazar eval() con alternativas más seguras y rápidas',
        impact: 'high',
        effort: 'medium'
      });
      this.stats.performance_improvements++;
    }

    // Detectar setTimeout sin cleanup
    const setTimeoutUsage = content.match(/setTimeout\s*\(/g) || [];
    if (setTimeoutUsage.length > 0) {
      this.optimizations.performance.push({
        file: filePath,
        type: 'setTimeout_cleanup',
        line: this.getLineNumber(content, content.indexOf(setTimeoutUsage[0])),
        suggestion:
          'Implementar cleanup de setTimeout para evitar memory leaks',
        impact: 'medium',
        effort: 'low'
      });
      this.stats.performance_improvements++;
    }

    // Detectar console.log en producción
    const consoleLogs = content.match(/console\.(log|warn|error|info)/g) || [];
    if (consoleLogs.length > 0) {
      this.optimizations.performance.push({
        file: filePath,
        type: 'console_logs',
        line: this.getLineNumber(content, content.indexOf(consoleLogs[0])),
        suggestion:
          'Remover console.logs en producción o usar logger condicional',
        impact: 'low',
        effort: 'low'
      });
      this.stats.performance_improvements++;
    }
  }

  /**
   * Analizar optimizaciones de mantenibilidad de archivo
   */
  analyzeFileMaintainability(filePath, content) {
    const lines = content.split('\n');

    // Detectar funciones largas
    const longFunctions = this.findLongFunctions(content);
    if (longFunctions.length > 0) {
      this.optimizations.maintainability.push({
        file: filePath,
        type: 'long_functions',
        line: longFunctions[0].line,
        suggestion: `Dividir función '${longFunctions[0].name}' en funciones más pequeñas`,
        impact: 'high',
        effort: 'medium'
      });
      this.stats.refactors_suggested++;
    }

    // Detectar código duplicado
    const duplicatedCode = this.findDuplicatedCode(content);
    if (duplicatedCode.length > 0) {
      this.optimizations.maintainability.push({
        file: filePath,
        type: 'code_duplication',
        line: duplicatedCode[0].line,
        suggestion: 'Extraer código duplicado a función común',
        impact: 'high',
        effort: 'medium'
      });
      this.stats.refactors_suggested++;
    }

    // Detectar números mágicos
    const magicNumbers = content.match(/\b\d{3,}\b/g) || [];
    if (magicNumbers.length > 0) {
      this.optimizations.maintainability.push({
        file: filePath,
        type: 'magic_numbers',
        line: this.getLineNumber(content, content.indexOf(magicNumbers[0])),
        suggestion: 'Reemplazar números mágicos con constantes con nombre',
        impact: 'medium',
        effort: 'low'
      });
      this.stats.refactors_suggested++;
    }

    // Detectar funciones con muchos parámetros
    const highParamFunctions = this.findHighParamFunctions(content);
    if (highParamFunctions.length > 0) {
      this.optimizations.maintainability.push({
        file: filePath,
        type: 'high_parameter_count',
        line: highParamFunctions[0].line,
        suggestion: `Usar objeto de parámetros para función '${highParamFunctions[0].name}'`,
        impact: 'medium',
        effort: 'low'
      });
      this.stats.refactors_suggested++;
    }
  }

  /**
   * Analizar optimizaciones de legibilidad de archivo
   */
  analyzeFileReadability(filePath, content) {
    const lines = content.split('\n');

    // Detectar nombres de variables poco descriptivos
    const badVariableNames =
      content.match(
        /\b(let|const|var)\s+(a|b|c|temp|tmp|data|item|obj|arr)\b/g
      ) || [];
    if (badVariableNames.length > 0) {
      this.optimizations.readability.push({
        file: filePath,
        type: 'bad_variable_names',
        line: this.getLineNumber(content, content.indexOf(badVariableNames[0])),
        suggestion: 'Usar nombres de variables más descriptivos',
        impact: 'medium',
        effort: 'low'
      });
    }

    // Detectar comentarios TODO sin fecha
    const todoComments =
      content.match(/\/\/\s*TODO(?!\s*\(\d{4}-\d{2}-\d{2}\))/g) || [];
    if (todoComments.length > 0) {
      this.optimizations.readability.push({
        file: filePath,
        type: 'todo_without_date',
        line: this.getLineNumber(content, content.indexOf(todoComments[0])),
        suggestion: 'Agregar fecha a comentarios TODO para tracking',
        impact: 'low',
        effort: 'low'
      });
    }

    // Detectar funciones sin documentación
    const functions =
      content.match(/function\s+\w+|const\s+\w+\s*=\s*(?:async\s+)?\(/g) || [];
    const documentedFunctions =
      content.match(/\/\*\*[\s\S]*?\*\/\s*(?:function|const)/g) || [];
    if (functions.length > documentedFunctions.length) {
      this.optimizations.readability.push({
        file: filePath,
        type: 'missing_documentation',
        line: 1,
        suggestion: 'Agregar documentación JSDoc a funciones públicas',
        impact: 'medium',
        effort: 'medium'
      });
    }
  }

  /**
   * Analizar optimizaciones de seguridad de archivo
   */
  analyzeFileSecurity(filePath, content) {
    // Detectar uso de innerHTML
    const innerHTMLUsage = content.match(/\.innerHTML\s*=/g) || [];
    if (innerHTMLUsage.length > 0) {
      this.optimizations.security.push({
        file: filePath,
        type: 'innerHTML_usage',
        line: this.getLineNumber(content, content.indexOf(innerHTMLUsage[0])),
        suggestion: 'Usar textContent o sanitizar contenido para prevenir XSS',
        impact: 'high',
        effort: 'medium'
      });
    }

    // Detectar concatenación de SQL
    const sqlConcatenation =
      content.match(/SELECT.*\+|INSERT.*\+|UPDATE.*\+|DELETE.*\+/g) || [];
    if (sqlConcatenation.length > 0) {
      this.optimizations.security.push({
        file: filePath,
        type: 'sql_injection_risk',
        line: this.getLineNumber(content, content.indexOf(sqlConcatenation[0])),
        suggestion:
          'Usar consultas preparadas o ORM para prevenir SQL injection',
        impact: 'high',
        effort: 'high'
      });
    }

    // Detectar hardcoded secrets
    const hardcodedSecrets =
      content.match(
        /(password|secret|key|token)\s*[:=]\s*['"][^'"]{8,}['"]/gi
      ) || [];
    if (hardcodedSecrets.length > 0) {
      this.optimizations.security.push({
        file: filePath,
        type: 'hardcoded_secrets',
        line: this.getLineNumber(content, content.indexOf(hardcodedSecrets[0])),
        suggestion: 'Mover secretos a variables de entorno',
        impact: 'critical',
        effort: 'low'
      });
    }
  }

  /**
   * Encontrar funciones largas
   */
  findLongFunctions(content) {
    const lines = content.split('\n');
    const functions = [];
    let currentFunction = null;
    let functionStart = 0;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const functionMatch = line.match(
        /function\s+(\w+)|const\s+(\w+)\s*=\s*(?:async\s+)?\(/
      );

      if (functionMatch) {
        if (currentFunction && i - functionStart > 50) {
          functions.push({ name: currentFunction, line: functionStart + 1 });
        }
        currentFunction = functionMatch[1] || functionMatch[2];
        functionStart = i;
      }
    }

    if (currentFunction && lines.length - functionStart > 50) {
      functions.push({ name: currentFunction, line: functionStart + 1 });
    }

    return functions;
  }

  /**
   * Encontrar código duplicado (simplificado)
   */
  findDuplicatedCode(content) {
    const lines = content.split('\n');
    const duplicates = [];

    // Buscar líneas repetidas (simplificado)
    const lineCounts = {};
    lines.forEach((line, index) => {
      const trimmed = line.trim();
      if (trimmed.length > 20) {
        // Solo líneas significativas
        if (lineCounts[trimmed]) {
          lineCounts[trimmed].count++;
          if (lineCounts[trimmed].count === 2) {
            duplicates.push({ line: index + 1, content: trimmed });
          }
        } else {
          lineCounts[trimmed] = { count: 1, line: index + 1 };
        }
      }
    });

    return duplicates;
  }

  /**
   * Encontrar funciones con muchos parámetros
   */
  findHighParamFunctions(content) {
    const functionMatches =
      content.match(
        /function\s+(\w+)\s*\([^)]*\)|const\s+(\w+)\s*=\s*(?:async\s+)?\([^)]*\)/g
      ) || [];
    const highParamFunctions = [];

    functionMatches.forEach(match => {
      const params = match.match(/\(([^)]*)\)/);
      if (params) {
        const paramCount = params[1].split(',').filter(p => p.trim()).length;
        if (paramCount > 5) {
          const nameMatch = match.match(/function\s+(\w+)|const\s+(\w+)/);
          const name = nameMatch ? nameMatch[1] || nameMatch[2] : 'unknown';
          highParamFunctions.push({ name, line: 1 }); // Simplificado
        }
      }
    });

    return highParamFunctions;
  }

  /**
   * Obtener número de línea
   */
  getLineNumber(content, index) {
    return content.substring(0, index).split('\n').length;
  }

  /**
   * Generar reporte de optimizaciones
   */
  generateReport() {
    const totalOptimizations = Object.values(this.optimizations).reduce(
      (sum, arr) => sum + arr.length,
      0
    );
    this.stats.optimizations_found = totalOptimizations;

    return {
      summary: {
        total_optimizations: totalOptimizations,
        performance_optimizations: this.optimizations.performance.length,
        maintainability_optimizations:
          this.optimizations.maintainability.length,
        readability_optimizations: this.optimizations.readability.length,
        security_optimizations: this.optimizations.security.length,
        files_analyzed: this.stats.files_analyzed
      },
      performance_optimizations: this.optimizations.performance,
      maintainability_optimizations: this.optimizations.maintainability,
      readability_optimizations: this.optimizations.readability,
      security_optimizations: this.optimizations.security,
      recommendations: this.generateRecommendations()
    };
  }

  /**
   * Generar recomendaciones
   */
  generateRecommendations() {
    const recommendations = [];

    if (this.optimizations.performance.length > 0) {
      recommendations.push({
        type: 'performance',
        priority: 'high',
        message: `${this.optimizations.performance.length} optimizaciones de rendimiento encontradas`,
        actions: [
          'Revisar y aplicar optimizaciones de rendimiento',
          'Implementar profiling para medir mejoras',
          'Considerar lazy loading para módulos pesados'
        ]
      });
    }

    if (this.optimizations.maintainability.length > 0) {
      recommendations.push({
        type: 'maintainability',
        priority: 'medium',
        message: `${this.optimizations.maintainability.length} mejoras de mantenibilidad sugeridas`,
        actions: [
          'Refactorizar código duplicado',
          'Dividir funciones largas',
          'Implementar principios SOLID'
        ]
      });
    }

    if (this.optimizations.security.length > 0) {
      recommendations.push({
        type: 'security',
        priority: 'critical',
        message: `${this.optimizations.security.length} vulnerabilidades de seguridad detectadas`,
        actions: [
          'Revisar y corregir vulnerabilidades inmediatamente',
          'Implementar validación de entrada',
          'Usar bibliotecas de seguridad probadas'
        ]
      });
    }

    return recommendations;
  }

  /**
   * Generar comandos de autofix basados en las optimizaciones encontradas
   */
  generateAutofixCommands() {
    const commands = [];

    // Procesar optimizaciones de performance
    for (const opt of this.optimizations.performance) {
      if (this.isAutofixable(opt)) {
        commands.push({
          type: 'performance',
          file_path: opt.file,
          description: opt.suggestion,
          fix_command: this.generateFixCommand(opt),
          priority: this.getPriority(opt.impact),
          auto_fixable: true
        });
      }
    }

    // Procesar optimizaciones de mantenibilidad
    for (const opt of this.optimizations.maintainability) {
      if (this.isAutofixable(opt)) {
        commands.push({
          type: 'maintainability',
          file_path: opt.file,
          description: opt.suggestion,
          fix_command: this.generateFixCommand(opt),
          priority: this.getPriority(opt.impact),
          auto_fixable: true
        });
      }
    }

    // Procesar optimizaciones de legibilidad
    for (const opt of this.optimizations.readability) {
      if (this.isAutofixable(opt)) {
        commands.push({
          type: 'readability',
          file_path: opt.file,
          description: opt.suggestion,
          fix_command: this.generateFixCommand(opt),
          priority: this.getPriority(opt.impact),
          auto_fixable: true
        });
      }
    }

    // Procesar optimizaciones de seguridad
    for (const opt of this.optimizations.security) {
      if (this.isAutofixable(opt)) {
        commands.push({
          type: 'security',
          file_path: opt.file,
          description: opt.suggestion,
          fix_command: this.generateFixCommand(opt),
          priority: this.getPriority(opt.impact),
          auto_fixable: true
        });
      }
    }

    return commands;
  }

  /**
   * Determinar si una optimización es automáticamente corregible
   */
  isAutofixable(optimization) {
    const autofixableTypes = [
      'console_logs',
      'magic_numbers',
      'unused_imports',
      'missing_semicolons',
      'trailing_whitespace',
      'inconsistent_quotes',
      'missing_const',
      'var_usage'
    ];

    return (
      autofixableTypes.includes(optimization.type) &&
      optimization.effort === 'low'
    );
  }

  /**
   * Generar comando de corrección específico
   */
  generateFixCommand(optimization) {
    switch (optimization.type) {
      case 'console_logs':
        return `sed -i '' '/console\\.(log|warn|error|info)/d' "${optimization.file}"`;

      case 'magic_numbers':
        return '# Reemplazar números mágicos con constantes - requiere revisión manual';

      case 'unused_imports':
        return `npx eslint --fix "${optimization.file}"`;

      case 'missing_semicolons':
        return `npx eslint --fix "${optimization.file}"`;

      case 'trailing_whitespace':
        return `sed -i '' 's/[[:space:]]*$//' "${optimization.file}"`;

      case 'inconsistent_quotes':
        return `npx eslint --fix "${optimization.file}"`;

      case 'missing_const':
        return `npx eslint --fix "${optimization.file}"`;

      case 'var_usage':
        return `npx eslint --fix "${optimization.file}"`;

      default:
        return `# Corrección manual requerida: ${optimization.suggestion}`;
    }
  }

  /**
   * Obtener prioridad basada en el impacto
   */
  getPriority(impact) {
    switch (impact) {
      case 'high':
        return 'high';
      case 'medium':
        return 'medium';
      case 'low':
        return 'low';
      default:
        return 'medium';
    }
  }
}

// CLI interface
if (import.meta.url === `file://${process.argv[1]}`) {
  const agent = new OptimizationAgent();
  const input = JSON.parse(process.argv[2] || '{}');

  agent
    .process(input)
    .then(result => {
      console.log(JSON.stringify(result, null, 2));
    })
    .catch(error => {
      console.error(
        JSON.stringify(
          {
            schema_version: '1.0.0',
            agent_version: '1.0.0',
            error: `optimization.server:error:${error.message}`,
            trace: ['optimization.server:error']
          },
          null,
          2
        )
      );
      process.exit(1);
    });
}

export default OptimizationAgent;
