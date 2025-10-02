#!/usr/bin/env node
/**
 * Test Real para GAP-005: Gestión Segura de Secretos
 * Este test analiza secretos reales sin datos simulados
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

const FILES_TO_ANALYZE = [
  'utils/jwt-auth.js',
  'utils/agent-auth-middleware.js',
  'utils/log-sanitizer.js',
  'utils/file-rate-limiter.js',
  'agents/context/agent.js',
  'agents/security/agent.js',
  'agents/prompting/agent.js',
  'agents/rules/agent.js',
  'orchestration/orchestrator.js',
  'package.json',
  '.env',
  '.env.example',
];

// Patrones de secretos a buscar
const SECRET_PATTERNS = [
  // Claves hardcodeadas
  {
    pattern: /secret\s*[:=]\s*["']?[^"'\s]+["']?/gi,
    type: 'hardcoded_secret',
    severity: 'critical',
  },
  { pattern: /key\s*[:=]\s*["']?[^"'\s]+["']?/gi, type: 'hardcoded_key', severity: 'critical' },
  {
    pattern: /password\s*[:=]\s*["']?[^"'\s]+["']?/gi,
    type: 'hardcoded_password',
    severity: 'critical',
  },
  { pattern: /token\s*[:=]\s*["']?[^"'\s]+["']?/gi, type: 'hardcoded_token', severity: 'critical' },
  {
    pattern: /api[_-]?key\s*[:=]\s*["']?[^"'\s]+["']?/gi,
    type: 'hardcoded_api_key',
    severity: 'critical',
  },

  // Claves de cifrado
  {
    pattern: /encryption[_-]?key\s*[:=]\s*["']?[^"'\s]+["']?/gi,
    type: 'encryption_key',
    severity: 'critical',
  },
  {
    pattern: /private[_-]?key\s*[:=]\s*["']?[^"'\s]+["']?/gi,
    type: 'private_key',
    severity: 'critical',
  },
  { pattern: /public[_-]?key\s*[:=]\s*["']?[^"'\s]+["']?/gi, type: 'public_key', severity: 'high' },

  // Credenciales de base de datos
  {
    pattern: /db[_-]?password\s*[:=]\s*["']?[^"'\s]+["']?/gi,
    type: 'db_password',
    severity: 'critical',
  },
  {
    pattern: /database[_-]?password\s*[:=]\s*["']?[^"'\s]+["']?/gi,
    type: 'database_password',
    severity: 'critical',
  },

  // URLs con credenciales
  { pattern: /https?:\/\/[^:]+:[^@]+@/gi, type: 'url_with_credentials', severity: 'critical' },

  // Variables de entorno mal usadas
  {
    pattern: /process\.env\.[A-Z_]+.*=.*["'][^"']+["']/gi,
    type: 'env_hardcoded',
    severity: 'high',
  },
];

// Patrones de gestión segura
const SECURE_PATTERNS = [
  { pattern: /process\.env\.[A-Z_]+/g, type: 'env_variable', security_level: 'good' },
  { pattern: /require.*dotenv/g, type: 'dotenv_usage', security_level: 'good' },
  { pattern: /\.env/g, type: 'env_file', security_level: 'good' },
  { pattern: /crypto\.createHmac/g, type: 'crypto_usage', security_level: 'good' },
  { pattern: /crypto\.randomBytes/g, type: 'random_bytes', security_level: 'good' },
  { pattern: /crypto\.scrypt/g, type: 'scrypt_usage', security_level: 'good' },
];

function analyzeSecretsInFile(filePath) {
  const findings = {
    file: filePath,
    hardcoded_secrets: [],
    secure_patterns: [],
    risk_score: 0,
    secure_score: 0,
  };

  try {
    const content = readFileSync(filePath, 'utf8');

    // Buscar secretos hardcodeados
    for (const pattern of SECRET_PATTERNS) {
      const matches = content.match(pattern.pattern);
      if (matches) {
        for (const match of matches) {
          findings.hardcoded_secrets.push({
            type: pattern.type,
            severity: pattern.severity,
            match: match,
            line: content.substring(0, content.indexOf(match)).split('\n').length,
          });

          // Calcular score de riesgo
          if (pattern.severity === 'critical') {
            findings.risk_score += 10;
          } else if (pattern.severity === 'high') {
            findings.risk_score += 5;
          }
        }
      }
    }

    // Buscar patrones seguros
    for (const pattern of SECURE_PATTERNS) {
      const matches = content.match(pattern.pattern);
      if (matches) {
        for (const match of matches) {
          findings.secure_patterns.push({
            type: pattern.type,
            security_level: pattern.security_level,
            match: match,
            line: content.substring(0, content.indexOf(match)).split('\n').length,
          });

          // Calcular score de seguridad
          if (pattern.security_level === 'good') {
            findings.secure_score += 2;
          }
        }
      }
    }
  } catch (error) {
    findings.error = error.message;
  }

  return findings;
}

function testSecretsManagement() {
  console.log('🚀 Starting GAP-005 Secrets Management Analysis...');
  console.log('Analyzing files for hardcoded secrets and secure patterns...');

  const results = {
    files_analyzed: 0,
    total_hardcoded_secrets: 0,
    total_secure_patterns: 0,
    total_risk_score: 0,
    total_secure_score: 0,
    findings: [],
  };

  for (const filePath of FILES_TO_ANALYZE) {
    console.log(`\n📁 Analyzing: ${filePath}`);

    const findings = analyzeSecretsInFile(filePath);
    results.findings.push(findings);
    results.files_analyzed++;

    if (findings.error) {
      console.log(`  ❌ Error reading file: ${findings.error}`);
      continue;
    }

    console.log(`  🔍 Hardcoded secrets: ${findings.hardcoded_secrets.length}`);
    console.log(`  🔒 Secure patterns: ${findings.secure_patterns.length}`);
    console.log(`  ⚠️  Risk score: ${findings.risk_score}`);
    console.log(`  ✅ Security score: ${findings.secure_score}`);

    // Mostrar secretos hardcodeados encontrados
    if (findings.hardcoded_secrets.length > 0) {
      console.log(`  🚨 Hardcoded secrets found:`);
      for (const secret of findings.hardcoded_secrets) {
        console.log(`    - ${secret.severity.toUpperCase()}: ${secret.type} (line ${secret.line})`);
        console.log(`      Match: ${secret.match.substring(0, 50)}...`);
      }
    }

    // Mostrar patrones seguros encontrados
    if (findings.secure_patterns.length > 0) {
      console.log(`  🔐 Secure patterns found:`);
      for (const pattern of findings.secure_patterns) {
        console.log(
          `    - ${pattern.security_level.toUpperCase()}: ${pattern.type} (line ${pattern.line})`
        );
      }
    }

    results.total_hardcoded_secrets += findings.hardcoded_secrets.length;
    results.total_secure_patterns += findings.secure_patterns.length;
    results.total_risk_score += findings.risk_score;
    results.total_secure_score += findings.secure_score;
  }

  return results;
}

function generateReport(results) {
  console.log('\n📋 SECRETS MANAGEMENT ANALYSIS REPORT');
  console.log('='.repeat(60));

  console.log(`Files analyzed: ${results.files_analyzed}`);
  console.log(`Total hardcoded secrets: ${results.total_hardcoded_secrets}`);
  console.log(`Total secure patterns: ${results.total_secure_patterns}`);
  console.log(`Total risk score: ${results.total_risk_score}`);
  console.log(`Total security score: ${results.total_secure_score}`);

  // Calcular score general
  const security_ratio =
    results.total_secure_patterns / Math.max(results.total_hardcoded_secrets, 1);
  const risk_ratio = results.total_risk_score / Math.max(results.total_secure_score, 1);

  console.log(`Security ratio: ${security_ratio.toFixed(2)}`);
  console.log(`Risk ratio: ${risk_ratio.toFixed(2)}`);

  // Determinar estado general
  let overall_status = 'unknown';
  if (results.total_hardcoded_secrets === 0 && results.total_secure_patterns > 0) {
    overall_status = 'excellent';
    console.log('🎉 EXCELLENT: No hardcoded secrets found, secure patterns implemented');
  } else if (results.total_hardcoded_secrets < 3 && security_ratio > 2) {
    overall_status = 'good';
    console.log('✅ GOOD: Few hardcoded secrets, good security patterns');
  } else if (results.total_hardcoded_secrets < 10 && security_ratio > 1) {
    overall_status = 'fair';
    console.log('⚠️  FAIR: Some hardcoded secrets, basic security patterns');
  } else {
    overall_status = 'poor';
    console.log('❌ POOR: Many hardcoded secrets, insufficient security patterns');
  }

  // Mostrar archivos con más problemas
  const filesByRisk = results.findings
    .filter(f => f.risk_score > 0)
    .sort((a, b) => b.risk_score - a.risk_score);

  if (filesByRisk.length > 0) {
    console.log('\n🚨 Files with highest risk:');
    for (const file of filesByRisk.slice(0, 5)) {
      console.log(`  - ${file.file}: ${file.risk_score} risk points`);
    }
  }

  // Mostrar archivos más seguros
  const filesBySecurity = results.findings
    .filter(f => f.secure_score > 0)
    .sort((a, b) => b.secure_score - a.secure_score);

  if (filesBySecurity.length > 0) {
    console.log('\n🔒 Files with best security:');
    for (const file of filesBySecurity.slice(0, 5)) {
      console.log(`  - ${file.file}: ${file.secure_score} security points`);
    }
  }

  return {
    overall_status,
    needs_improvement: results.total_hardcoded_secrets > 0 || security_ratio < 2,
  };
}

// Ejecutar análisis
const results = testSecretsManagement();
const report = generateReport(results);

// Guardar reporte detallado
const detailedReport = {
  timestamp: new Date().toISOString(),
  test_name: 'GAP-005 Secrets Management Analysis',
  results: results,
  report: report,
  summary: {
    files_analyzed: results.files_analyzed,
    total_hardcoded_secrets: results.total_hardcoded_secrets,
    total_secure_patterns: results.total_secure_patterns,
    total_risk_score: results.total_risk_score,
    total_secure_score: results.total_secure_score,
    overall_status: report.overall_status,
    needs_improvement: report.needs_improvement,
  },
};

try {
  writeFileSync('gap-005-secrets-analysis-report.json', JSON.stringify(detailedReport, null, 2));
  console.log('\n📄 Detailed report saved to: gap-005-secrets-analysis-report.json');
} catch (error) {
  console.log(`\n⚠️  Could not save report: ${error.message}`);
}

// Exit con código apropiado
process.exit(report.needs_improvement ? 1 : 0);
