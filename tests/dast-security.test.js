/**
 * @fileoverview Tests for DAST Security Testing System
 */

import { describe, test, expect, beforeAll, afterAll } from '@jest/globals';
import { spawn } from 'node:child_process';
import { readFileSync, existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

const PROJECT_ROOT = process.cwd();
const REPORTS_DIR = join(PROJECT_ROOT, '.reports');
const DAST_DIR = join(REPORTS_DIR, 'dast');
const SECURITY_DIR = join(REPORTS_DIR, 'security');

// Crear directorios necesarios
beforeAll(() => {
  if (!existsSync(REPORTS_DIR)) {
    mkdirSync(REPORTS_DIR, { recursive: true });
  }
  if (!existsSync(DAST_DIR)) {
    mkdirSync(DAST_DIR, { recursive: true });
  }
  if (!existsSync(SECURITY_DIR)) {
    mkdirSync(SECURITY_DIR, { recursive: true });
  }
});

// Función helper para ejecutar scripts
function runScript(script, args = []) {
  return new Promise((resolve, reject) => {
    const child = spawn('bash', [script, ...args], {
      cwd: PROJECT_ROOT,
      stdio: ['pipe', 'pipe', 'pipe']
    });

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    child.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    child.on('close', (code) => {
      resolve({
        code,
        stdout,
        stderr
      });
    });

    child.on('error', (error) => {
      reject(error);
    });
  });
}

describe('DAST Security Testing System', () => {
  describe('DAST Scanner', () => {
    test('should show help when no arguments provided', async () => {
      const result = await runScript('./scripts/dast-scan.sh');
      
      expect(result.code).toBe(1);
      expect(result.stderr).toContain('URL objetivo requerida');
      expect(result.stderr).toContain('USAGE:');
    });

    test('should show help with --help flag', async () => {
      const result = await runScript('./scripts/dast-scan.sh', ['--help']);
      
      expect(result.code).toBe(0);
      expect(result.stdout).toContain('DAST Scanner - Dynamic Application Security Testing');
      expect(result.stdout).toContain('USAGE:');
    });

    test('should perform basic scan on httpbin.org', async () => {
      const result = await runScript('./scripts/dast-scan.sh', [
        '-t', 'basic',
        '-v',
        'https://httpbin.org'
      ]);
      
      // El escaneo puede encontrar vulnerabilidades o no
      // Solo verificamos que se ejecute sin errores críticos
      expect([0, 1]).toContain(result.code);
      
      // Verificar que se generó un reporte
      const reportFiles = require('node:fs').readdirSync(DAST_DIR)
        .filter(file => file.startsWith('dast-report-') && file.endsWith('.json'));
      
      expect(reportFiles.length).toBeGreaterThan(0);
      
      // Verificar estructura del reporte
      const latestReport = reportFiles[reportFiles.length - 1];
      const reportPath = join(DAST_DIR, latestReport);
      const report = JSON.parse(readFileSync(reportPath, 'utf8'));
      
      expect(report).toHaveProperty('scan_info');
      expect(report).toHaveProperty('summary');
      expect(report).toHaveProperty('findings');
      expect(report.scan_info).toHaveProperty('target', 'https://httpbin.org');
      expect(report.scan_info).toHaveProperty('type', 'basic');
    });

    test('should perform API scan on httpbin.org', async () => {
      const result = await runScript('./scripts/dast-scan.sh', [
        '-t', 'api',
        '-v',
        'https://httpbin.org'
      ]);
      
      expect([0, 1]).toContain(result.code);
      
      // Verificar que se generó un reporte
      const reportFiles = require('node:fs').readdirSync(DAST_DIR)
        .filter(file => file.startsWith('dast-report-') && file.endsWith('.json'));
      
      expect(reportFiles.length).toBeGreaterThan(0);
    });

    test('should validate scan types', async () => {
      const result = await runScript('./scripts/dast-scan.sh', [
        '-t', 'invalid',
        'https://httpbin.org'
      ]);
      
      expect(result.code).toBe(1);
      expect(result.stderr).toContain('Tipo de escaneo inválido');
    });
  });

  describe('Security Dependencies Scanner', () => {
    test('should show help when no arguments provided', async () => {
      const result = await runScript('./scripts/security-deps-scan.sh', ['--help']);
      
      expect(result.code).toBe(0);
      expect(result.stdout).toContain('Security Dependencies Scanner');
      expect(result.stdout).toContain('USAGE:');
    });

    test('should perform security dependencies scan', async () => {
      const result = await runScript('./scripts/security-deps-scan.sh', [
        '-l', 'moderate',
        '-v'
      ]);
      
      // El escaneo puede encontrar vulnerabilidades o no
      expect([0, 1]).toContain(result.code);
      
      // Verificar que se generó un reporte
      const reportFiles = require('node:fs').readdirSync(SECURITY_DIR)
        .filter(file => file.startsWith('security-deps-report-') && file.endsWith('.json'));
      
      expect(reportFiles.length).toBeGreaterThan(0);
      
      // Verificar estructura del reporte
      const latestReport = reportFiles[reportFiles.length - 1];
      const reportPath = join(SECURITY_DIR, latestReport);
      const report = JSON.parse(readFileSync(reportPath, 'utf8'));
      
      expect(report).toHaveProperty('scan_info');
      expect(report).toHaveProperty('summary');
      expect(report).toHaveProperty('findings');
      expect(report.scan_info).toHaveProperty('audit_level', 'moderate');
    });

    test('should validate audit levels', async () => {
      const result = await runScript('./scripts/security-deps-scan.sh', [
        '-l', 'invalid'
      ]);
      
      expect(result.code).toBe(1);
      expect(result.stderr).toContain('Nivel de auditoría inválido');
    });
  });

  describe('Security Report Aggregator', () => {
    test('should show help when no arguments provided', async () => {
      const result = await runScript('./scripts/security-report-aggregator.sh', ['--help']);
      
      expect(result.code).toBe(0);
      expect(result.stdout).toContain('Security Report Aggregator');
      expect(result.stdout).toContain('USAGE:');
    });

    test('should aggregate security reports', async () => {
      // Primero generar algunos reportes de prueba
      await runScript('./scripts/dast-scan.sh', [
        '-t', 'basic',
        'https://httpbin.org'
      ]);
      
      await runScript('./scripts/security-deps-scan.sh', [
        '-l', 'moderate'
      ]);
      
      // Luego agregar los reportes
      const result = await runScript('./scripts/security-report-aggregator.sh', [
        '-v'
      ]);
      
      expect([0, 1]).toContain(result.code);
      
      // Verificar que se generó un reporte consolidado
      const consolidatedDir = join(REPORTS_DIR, 'consolidated');
      const reportFiles = require('node:fs').readdirSync(consolidatedDir)
        .filter(file => file.startsWith('consolidated-security-report-') && file.endsWith('.json'));
      
      expect(reportFiles.length).toBeGreaterThan(0);
      
      // Verificar estructura del reporte consolidado
      const latestReport = reportFiles[reportFiles.length - 1];
      const reportPath = join(consolidatedDir, latestReport);
      const report = JSON.parse(readFileSync(reportPath, 'utf8'));
      
      expect(report).toHaveProperty('consolidated_info');
      expect(report).toHaveProperty('summary');
      expect(report).toHaveProperty('reports');
      expect(report.consolidated_info).toHaveProperty('timestamp');
      expect(report.consolidated_info).toHaveProperty('aggregator_version');
    });
  });

  describe('NPM Scripts Integration', () => {
    test('should run dast:basic script', async () => {
      const result = await runScript('npm', ['run', 'dast:basic', 'https://httpbin.org']);
      
      expect([0, 1]).toContain(result.code);
    });

    test('should run security:deps script', async () => {
      const result = await runScript('npm', ['run', 'security:deps']);
      
      expect([0, 1]).toContain(result.code);
    });

    test('should run security:aggregate script', async () => {
      const result = await runScript('npm', ['run', 'security:aggregate']);
      
      expect([0, 1]).toContain(result.code);
    });
  });

  describe('Report Structure Validation', () => {
    test('should generate valid JSON reports', async () => {
      // Generar reportes
      await runScript('./scripts/dast-scan.sh', [
        '-t', 'basic',
        'https://httpbin.org'
      ]);
      
      await runScript('./scripts/security-deps-scan.sh', [
        '-l', 'moderate'
      ]);
      
      // Verificar que los reportes son JSON válidos
      const dastReports = require('node:fs').readdirSync(DAST_DIR)
        .filter(file => file.startsWith('dast-report-') && file.endsWith('.json'));
      
      const securityReports = require('node:fs').readdirSync(SECURITY_DIR)
        .filter(file => file.startsWith('security-deps-report-') && file.endsWith('.json'));
      
      expect(dastReports.length).toBeGreaterThan(0);
      expect(securityReports.length).toBeGreaterThan(0);
      
      // Verificar que son JSON válidos
      for (const report of dastReports) {
        const reportPath = join(DAST_DIR, report);
        expect(() => JSON.parse(readFileSync(reportPath, 'utf8'))).not.toThrow();
      }
      
      for (const report of securityReports) {
        const reportPath = join(SECURITY_DIR, report);
        expect(() => JSON.parse(readFileSync(reportPath, 'utf8'))).not.toThrow();
      }
    });
  });
});
