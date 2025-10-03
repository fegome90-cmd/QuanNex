#!/usr/bin/env node
/**
 * 🔍 AUDITORÍA DE BYPASSES DE SEGURIDAD EN GIT
 *
 * Este script detecta y reporta el uso de --no-verify y otros bypasses
 * que comprometen la integridad de las verificaciones de seguridad.
 */

import { execSync } from 'node:child_process';
import { writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

const REPORTS_DIR = '.reports';
const AUDIT_FILE = join(REPORTS_DIR, 'git-bypasses-audit.json');

// Crear directorio de reportes si no existe
if (!existsSync(REPORTS_DIR)) {
  mkdirSync(REPORTS_DIR, { recursive: true });
}

class GitBypassAuditor {
  constructor() {
    this.auditResults = {
      timestamp: new Date().toISOString(),
      summary: {
        totalCommits: 0,
        bypassesDetected: 0,
        criticalBypasses: 0,
        warnings: 0,
      },
      bypasses: [],
      recommendations: [],
    };
  }

  /**
   * Ejecuta un comando git y retorna el resultado
   */
  runGitCommand(command) {
    try {
      return execSync(command, {
        encoding: 'utf8',
        stdio: 'pipe',
        cwd: process.cwd(),
      }).trim();
    } catch (error) {
      console.warn(`⚠️  Comando falló: ${command}`);
      return '';
    }
  }

  /**
   * Detecta commits con --no-verify
   */
  detectNoVerifyBypasses() {
    console.log('🔍 Detectando commits con --no-verify...');

    // Buscar en mensajes de commit
    const noVerifyCommits = this.runGitCommand(
      'git log --oneline --grep="--no-verify" --since="1 week ago"'
    );

    if (noVerifyCommits) {
      const commits = noVerifyCommits.split('\n').filter(line => line.trim());
      commits.forEach(commit => {
        this.auditResults.bypasses.push({
          type: 'no-verify',
          severity: 'CRITICAL',
          commit: commit,
          description: 'Commit realizado saltando verificaciones de seguridad',
          timestamp: new Date().toISOString(),
        });
        this.auditResults.summary.criticalBypasses++;
      });
    }
  }

  /**
   * Detecta commits con mensajes que indican bypasses
   */
  detectBypassMessages() {
    console.log('🔍 Detectando mensajes de bypass...');

    const bypassPatterns = [
      'skip.*test',
      'skip.*lint',
      'skip.*verify',
      'bypass.*security',
      'ignore.*error',
      'force.*push',
      'emergency.*commit',
    ];

    bypassPatterns.forEach(pattern => {
      const commits = this.runGitCommand(
        `git log --oneline --grep="${pattern}" --since="1 week ago" -i`
      );

      if (commits) {
        const commitList = commits.split('\n').filter(line => line.trim());
        commitList.forEach(commit => {
          this.auditResults.bypasses.push({
            type: 'bypass-message',
            severity: 'HIGH',
            commit: commit,
            description: `Mensaje de commit sugiere bypass: ${pattern}`,
            timestamp: new Date().toISOString(),
          });
          this.auditResults.summary.warnings++;
        });
      }
    });
  }

  /**
   * Detecta pushes forzados
   */
  detectForcePushes() {
    console.log('🔍 Detectando force pushes...');

    const reflog = this.runGitCommand('git reflog --since="1 week ago"');
    if (reflog) {
      const forcePushLines = reflog
        .split('\n')
        .filter(line => line.includes('force') || line.includes('--force'));

      forcePushLines.forEach(line => {
        this.auditResults.bypasses.push({
          type: 'force-push',
          severity: 'HIGH',
          commit: line,
          description: 'Force push detectado en reflog',
          timestamp: new Date().toISOString(),
        });
        this.auditResults.summary.warnings++;
      });
    }
  }

  /**
   * Analiza el estado actual de los hooks
   */
  analyzeHookStatus() {
    console.log('🔍 Analizando estado de hooks...');

    const hookFiles = [
      '.husky/pre-commit',
      '.husky/pre-push',
      '.git/hooks/pre-commit',
      '.git/hooks/pre-push',
    ];

    hookFiles.forEach(hookFile => {
      if (existsSync(hookFile)) {
        const content = this.runGitCommand(`cat ${hookFile}`);
        if (content.includes('--no-verify') || content.includes('skip')) {
          this.auditResults.bypasses.push({
            type: 'hook-bypass',
            severity: 'CRITICAL',
            commit: hookFile,
            description: 'Hook configurado para saltar verificaciones',
            timestamp: new Date().toISOString(),
          });
          this.auditResults.summary.criticalBypasses++;
        }
      }
    });
  }

  /**
   * Genera recomendaciones basadas en los hallazgos
   */
  generateRecommendations() {
    console.log('💡 Generando recomendaciones...');

    if (this.auditResults.summary.criticalBypasses > 0) {
      this.auditResults.recommendations.push({
        priority: 'CRITICAL',
        action: 'Revisar inmediatamente todos los commits con --no-verify',
        description: 'Los bypasses críticos comprometen la integridad del código',
      });
    }

    if (this.auditResults.summary.warnings > 5) {
      this.auditResults.recommendations.push({
        priority: 'HIGH',
        action: 'Implementar políticas más estrictas de commit',
        description: 'Demasiados warnings sugieren problemas sistémicos',
      });
    }

    this.auditResults.recommendations.push({
      priority: 'MEDIUM',
      action: 'Configurar alertas automáticas para bypasses',
      description: 'Implementar monitoreo continuo de integridad',
    });

    this.auditResults.recommendations.push({
      priority: 'LOW',
      action: 'Documentar procedimientos de emergencia',
      description: 'Crear guías para casos legítimos de bypass',
    });
  }

  /**
   * Genera el reporte final
   */
  generateReport() {
    this.auditResults.summary.totalCommits =
      this.runGitCommand('git rev-list --count HEAD --since="1 week ago"') || '0';

    this.auditResults.summary.bypassesDetected = this.auditResults.bypasses.length;

    // Escribir reporte JSON
    writeFileSync(AUDIT_FILE, JSON.stringify(this.auditResults, null, 2));

    // Mostrar resumen en consola
    console.log('\n📊 RESUMEN DE AUDITORÍA DE BYPASSES');
    console.log('=====================================');
    console.log(`📅 Período: Última semana`);
    console.log(`📝 Total commits: ${this.auditResults.summary.totalCommits}`);
    console.log(`🚨 Bypasses detectados: ${this.auditResults.summary.bypassesDetected}`);
    console.log(`🔴 Críticos: ${this.auditResults.summary.criticalBypasses}`);
    console.log(`⚠️  Warnings: ${this.auditResults.summary.warnings}`);

    if (this.auditResults.summary.criticalBypasses > 0) {
      console.log('\n🚨 BYPASSES CRÍTICOS DETECTADOS:');
      this.auditResults.bypasses
        .filter(b => b.severity === 'CRITICAL')
        .forEach(bypass => {
          console.log(`  - ${bypass.type}: ${bypass.commit}`);
        });
    }

    console.log('\n💡 RECOMENDACIONES:');
    this.auditResults.recommendations.forEach(rec => {
      console.log(`  [${rec.priority}] ${rec.action}`);
    });

    console.log(`\n📄 Reporte completo: ${AUDIT_FILE}`);

    // Retornar código de salida basado en severidad
    if (this.auditResults.summary.criticalBypasses > 0) {
      console.log('\n❌ AUDITORÍA FALLÓ - Bypasses críticos detectados');
      return 1;
    } else if (this.auditResults.summary.warnings > 3) {
      console.log('\n⚠️  AUDITORÍA CON WARNINGS - Revisar recomendaciones');
      return 2;
    } else {
      console.log('\n✅ AUDITORÍA EXITOSA - Sin bypasses críticos');
      return 0;
    }
  }

  /**
   * Ejecuta la auditoría completa
   */
  async run() {
    console.log('🔒 INICIANDO AUDITORÍA DE BYPASSES DE SEGURIDAD GIT');
    console.log('==================================================\n');

    this.detectNoVerifyBypasses();
    this.detectBypassMessages();
    this.detectForcePushes();
    this.analyzeHookStatus();
    this.generateRecommendations();

    return this.generateReport();
  }
}

// Ejecutar auditoría si se llama directamente
if (import.meta.url === `file://${process.argv[1]}`) {
  const auditor = new GitBypassAuditor();
  const exitCode = await auditor.run();
  process.exit(exitCode);
}

export default GitBypassAuditor;
