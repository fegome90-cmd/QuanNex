#!/usr/bin/env node
/**
 * @fileoverview Security Agent Server - Detección de secretos y compliance
 * @description Agente especializado para seguridad, detección de secretos y hardening
 */

import { readFileSync, writeFileSync, existsSync, statSync } from 'node:fs';
import { join, dirname, extname } from 'node:path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Patrones de secretos comunes
const SECRET_PATTERNS = [
  // API Keys
  {
    pattern: /(api[_-]?key|apikey)\s*[:=]\s*['"]?([a-zA-Z0-9_-]{20,})['"]?/gi,
    type: 'api_key'
  },
  // Passwords
  {
    pattern: /(password|passwd|pwd)\s*[:=]\s*['"]?([^'"\s]{8,})['"]?/gi,
    type: 'password'
  },
  // Tokens
  {
    pattern:
      /(token|access_token|refresh_token)\s*[:=]\s*['"]?([a-zA-Z0-9._-]{20,})['"]?/gi,
    type: 'token'
  },
  // Database URLs
  { pattern: /(mongodb|postgres|mysql):\/\/[^'"\s]+/gi, type: 'database_url' },
  // Private Keys
  {
    pattern: /-----BEGIN\s+(?:RSA\s+)?PRIVATE\s+KEY-----/gi,
    type: 'private_key'
  },
  // AWS Keys
  {
    pattern:
      /(aws[_-]?access[_-]?key[_-]?id|aws[_-]?secret[_-]?access[_-]?key)\s*[:=]\s*['"]?([A-Z0-9]{20,})['"]?/gi,
    type: 'aws_key'
  },
  // JWT Secrets
  {
    pattern:
      /(jwt[_-]?secret|jwt[_-]?key)\s*[:=]\s*['"]?([a-zA-Z0-9._-]{20,})['"]?/gi,
    type: 'jwt_secret'
  }
];

// Patrones de vulnerabilidades
const VULNERABILITY_PATTERNS = [
  // SQL Injection
  {
    pattern: /(SELECT|INSERT|UPDATE|DELETE).*\+.*['"]/gi,
    type: 'sql_injection',
    severity: 'high'
  },
  // XSS
  { pattern: /innerHTML\s*=\s*[^;]*\+/gi, type: 'xss', severity: 'medium' },
  // Hardcoded credentials
  {
    pattern: /(admin|root|user)\s*[:=]\s*['"]?(admin|password|123456)['"]?/gi,
    type: 'hardcoded_creds',
    severity: 'high'
  },
  // Unsafe eval
  { pattern: /eval\s*\(/gi, type: 'unsafe_eval', severity: 'high' },
  // Console logs in production
  {
    pattern: /console\.(log|warn|error|info)/gi,
    type: 'console_log',
    severity: 'low'
  }
];

class SecurityAgent {
  constructor() {
    this.findings = [];
    this.stats = {
      files_scanned: 0,
      secrets_found: 0,
      vulnerabilities_found: 0,
      compliance_score: 0
    };
  }

  /**
   * Procesar entrada del agente de seguridad
   */
  async process(input) {
    try {
      const { target_path, check_mode, policy_refs, scan_depth = 2 } = input;

      console.log(`🔒 Security Agent: Escaneando ${target_path}...`);

      // Escanear directorio
      await this.scanDirectory(target_path, scan_depth);

      // Aplicar políticas
      if (policy_refs && policy_refs.length > 0) {
        await this.applyPolicies(policy_refs);
      }

      // Calcular score de compliance
      this.calculateComplianceScore();

      // Generar reporte
      const report = this.generateReport();

      return {
        schema_version: '1.0.0',
        agent_version: '1.0.0',
        security_report: report,
        stats: this.stats,
        trace: ['security.server:ok']
      };
    } catch (error) {
      return {
        schema_version: '1.0.0',
        agent_version: '1.0.0',
        error: `security.server:error:${error.message}`,
        trace: ['security.server:error']
      };
    }
  }

  /**
   * Escanear directorio recursivamente
   */
  async scanDirectory(path, depth = 2) {
    if (depth <= 0) return;

    try {
      const entries = await this.readDirectory(path);

      for (const entry of entries) {
        const fullPath = join(path, entry);
        const stat = statSync(fullPath);

        if (stat.isDirectory()) {
          // Saltar directorios comunes que no necesitan escaneo
          if (
            !['node_modules', '.git', 'dist', 'build', 'coverage'].includes(
              entry
            )
          ) {
            await this.scanDirectory(fullPath, depth - 1);
          }
        } else if (stat.isFile()) {
          await this.scanFile(fullPath);
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
   * Escanear archivo individual
   */
  async scanFile(filePath) {
    try {
      const ext = extname(filePath).toLowerCase();

      // Solo escanear archivos de código
      if (
        ![
          '.js',
          '.ts',
          '.jsx',
          '.tsx',
          '.json',
          '.env',
          '.config',
          '.md'
        ].includes(ext)
      ) {
        return;
      }

      const content = readFileSync(filePath, 'utf8');
      this.stats.files_scanned++;

      // Buscar secretos
      this.findSecrets(filePath, content);

      // Buscar vulnerabilidades
      this.findVulnerabilities(filePath, content);
    } catch (error) {
      console.warn(`⚠️ No se pudo escanear ${filePath}: ${error.message}`);
    }
  }

  /**
   * Buscar secretos en el contenido
   */
  findSecrets(filePath, content) {
    for (const { pattern, type } of SECRET_PATTERNS) {
      const matches = [...content.matchAll(pattern)];

      for (const match of matches) {
        this.findings.push({
          type: 'secret',
          secret_type: type,
          file: filePath,
          line: this.getLineNumber(content, match.index),
          match: match[0],
          severity: 'high',
          recommendation: this.getSecretRecommendation(type)
        });
        this.stats.secrets_found++;
      }
    }
  }

  /**
   * Buscar vulnerabilidades en el contenido
   */
  findVulnerabilities(filePath, content) {
    for (const { pattern, type, severity } of VULNERABILITY_PATTERNS) {
      const matches = [...content.matchAll(pattern)];

      for (const match of matches) {
        this.findings.push({
          type: 'vulnerability',
          vuln_type: type,
          file: filePath,
          line: this.getLineNumber(content, match.index),
          match: match[0],
          severity: severity,
          recommendation: this.getVulnerabilityRecommendation(type)
        });
        this.stats.vulnerabilities_found++;
      }
    }
  }

  /**
   * Obtener número de línea
   */
  getLineNumber(content, index) {
    return content.substring(0, index).split('\n').length;
  }

  /**
   * Obtener recomendación para secreto
   */
  getSecretRecommendation(type) {
    const recommendations = {
      api_key: 'Usar variables de entorno o un gestor de secretos',
      password: 'Usar variables de entorno o un gestor de secretos',
      token: 'Usar variables de entorno o un gestor de secretos',
      database_url: 'Usar variables de entorno para la URL de la base de datos',
      private_key: 'Almacenar la clave privada en un gestor de secretos',
      aws_key: 'Usar IAM roles o AWS Secrets Manager',
      jwt_secret: 'Usar variables de entorno para el secreto JWT'
    };
    return recommendations[type] || 'Revisar y mover a variables de entorno';
  }

  /**
   * Obtener recomendación para vulnerabilidad
   */
  getVulnerabilityRecommendation(type) {
    const recommendations = {
      sql_injection: 'Usar consultas preparadas o un ORM',
      xss: 'Sanitizar entrada del usuario antes de renderizar',
      hardcoded_creds: 'Usar variables de entorno o un gestor de secretos',
      unsafe_eval: 'Evitar eval(), usar alternativas seguras',
      console_log: 'Remover logs de consola en producción'
    };
    return (
      recommendations[type] ||
      'Revisar y aplicar mejores prácticas de seguridad'
    );
  }

  /**
   * Aplicar políticas de seguridad
   */
  async applyPolicies(policyRefs) {
    for (const policyRef of policyRefs) {
      try {
        if (existsSync(policyRef)) {
          const policy = JSON.parse(readFileSync(policyRef, 'utf8'));
          this.applyPolicy(policy);
        }
      } catch (error) {
        console.warn(
          `⚠️ No se pudo aplicar política ${policyRef}: ${error.message}`
        );
      }
    }
  }

  /**
   * Aplicar política individual
   */
  applyPolicy(policy) {
    // Implementar lógica de aplicación de políticas
    // Por ahora, solo registrar que se aplicó
    console.log(`📋 Aplicando política: ${policy.name || 'Sin nombre'}`);
  }

  /**
   * Calcular score de compliance
   */
  calculateComplianceScore() {
    const totalIssues =
      this.stats.secrets_found + this.stats.vulnerabilities_found;
    const highSeverityIssues = this.findings.filter(
      f => f.severity === 'high'
    ).length;

    // Score base de 100, penalizar por issues
    let score = 100;
    score -= highSeverityIssues * 20; // -20 por issue de alta severidad
    score -= (totalIssues - highSeverityIssues) * 5; // -5 por otros issues

    this.stats.compliance_score = Math.max(0, score);
  }

  /**
   * Generar reporte de seguridad
   */
  generateReport() {
    const highSeverity = this.findings.filter(
      f => f.severity === 'high'
    ).length;
    const mediumSeverity = this.findings.filter(
      f => f.severity === 'medium'
    ).length;
    const lowSeverity = this.findings.filter(f => f.severity === 'low').length;

    return {
      summary: {
        total_findings: this.findings.length,
        secrets_found: this.stats.secrets_found,
        vulnerabilities_found: this.stats.vulnerabilities_found,
        compliance_score: this.stats.compliance_score,
        severity_breakdown: {
          high: highSeverity,
          medium: mediumSeverity,
          low: lowSeverity
        }
      },
      findings: this.findings,
      recommendations: this.generateRecommendations()
    };
  }

  /**
   * Generar recomendaciones
   */
  generateRecommendations() {
    const recommendations = [];

    if (this.stats.secrets_found > 0) {
      recommendations.push({
        type: 'secrets',
        priority: 'high',
        message: `${this.stats.secrets_found} secretos encontrados. Implementar gestor de secretos.`,
        actions: [
          'Usar variables de entorno para secretos',
          'Implementar AWS Secrets Manager o similar',
          'Revisar y rotar secretos expuestos'
        ]
      });
    }

    if (this.stats.vulnerabilities_found > 0) {
      recommendations.push({
        type: 'vulnerabilities',
        priority: 'medium',
        message: `${this.stats.vulnerabilities_found} vulnerabilidades encontradas. Aplicar parches.`,
        actions: [
          'Revisar código para vulnerabilidades',
          'Implementar validación de entrada',
          'Aplicar mejores prácticas de seguridad'
        ]
      });
    }

    if (this.stats.compliance_score < 80) {
      recommendations.push({
        type: 'compliance',
        priority: 'high',
        message: `Score de compliance bajo (${this.stats.compliance_score}/100). Mejorar seguridad.`,
        actions: [
          'Revisar políticas de seguridad',
          'Implementar auditorías regulares',
          'Capacitar al equipo en seguridad'
        ]
      });
    }

    return recommendations;
  }
}

// CLI interface
if (import.meta.url === `file://${process.argv[1]}`) {
  const agent = new SecurityAgent();
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
            error: `security.server:error:${error.message}`,
            trace: ['security.server:error']
          },
          null,
          2
        )
      );
      process.exit(1);
    });
}

export default SecurityAgent;
