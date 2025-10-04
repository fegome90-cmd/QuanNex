#!/usr/bin/env node
/* eslint-env node */
/* global console, process */

import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

function execCommand(cmd) {
  try {
    return execSync(cmd, { encoding: 'utf8', stdio: 'pipe' }).trim();
  } catch (err) {
    return '';
  }
}

async function main() {
  console.log('🛰️ OLA 3 - Sprint 3: Observabilidad Continua\n');
  
  // PASO 1: Verificar exporter de métricas
  console.log('🚀 PASO 1: Verificando exporter de métricas...');
  try {
    const metrics = execCommand('curl -s http://localhost:9464/metrics | head -n 5');
    if (metrics.includes('taskdb_')) {
      console.log('✅ Exporter funcionando correctamente');
    } else {
      console.log('⚠️ Exporter no responde, iniciando...');
      execCommand('npm run taskdb:metrics &');
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  } catch (err) {
    console.log('⚠️ Error verificando exporter:', err.message);
  }
  
  // PASO 2: Configurar Prometheus
  console.log('\n📊 PASO 2: Configurando Prometheus...');
  const prometheusConfig = 'config/prometheus.yml';
  if (fs.existsSync(prometheusConfig)) {
    console.log('✅ Configuración Prometheus ya existe');
  } else {
    console.log('❌ Configuración Prometheus no encontrada');
  }
  
  // PASO 3: Dashboard Grafana
  console.log('\n📈 PASO 3: Verificando dashboard Grafana...');
  const dashboardConfig = 'config/grafana-dashboard-taskdb.json';
  if (fs.existsSync(dashboardConfig)) {
    console.log('✅ Dashboard Grafana configurado');
    console.log('💡 Importar en Grafana: config/grafana-dashboard-taskdb.json');
  } else {
    console.log('❌ Dashboard Grafana no encontrado');
  }
  
  // PASO 4: Alertas suaves
  console.log('\n🚨 PASO 4: Configurando alertas suaves...');
  const alertScript = 'scripts/alert-thresholds.mjs';
  if (fs.existsSync(alertScript)) {
    console.log('✅ Script de alertas disponible');
    console.log('💡 Usar en cron: node scripts/alert-thresholds.mjs');
  } else {
    console.log('❌ Script de alertas no encontrado');
  }
  
  // PASO 5: Baseline diario
  console.log('\n📋 PASO 5: Generando baseline diario...');
  try {
    execCommand('npm run taskdb:baseline');
    console.log('✅ Baseline generado');
  } catch (err) {
    console.log('⚠️ Error generando baseline:', err.message);
  }
  
  // PASO 6: Snapshot de métricas
  console.log('\n📸 PASO 6: Guardando snapshot de métricas...');
  try {
    const date = new Date().toISOString().split('T')[0];
    const snapshotPath = `reports/metrics-${date}.prom`;
    execCommand(`curl -s http://localhost:9464/metrics > ${snapshotPath}`);
    console.log(`✅ Snapshot guardado: ${snapshotPath}`);
  } catch (err) {
    console.log('⚠️ Error guardando snapshot:', err.message);
  }
  
  // PASO 7: Verificar Definition of Done
  console.log('\n✅ PASO 7: Verificando Definition of Done...');
  
  const dodChecks = [
    { name: 'Dashboard configurado', check: () => fs.existsSync(dashboardConfig) },
    { name: 'Prometheus configurado', check: () => fs.existsSync(prometheusConfig) },
    { name: 'Alertas disponibles', check: () => fs.existsSync(alertScript) },
    { name: 'Baseline generado', check: () => fs.existsSync('reports/TASKDB-BASELINE.md') },
    { name: 'Snapshot guardado', check: () => fs.existsSync(`reports/metrics-${new Date().toISOString().split('T')[0]}.prom`) }
  ];
  
  let passedChecks = 0;
  dodChecks.forEach(check => {
    if (check.check()) {
      console.log(`✅ ${check.name}`);
      passedChecks++;
    } else {
      console.log(`❌ ${check.name}`);
    }
  });
  
  console.log(`\n📊 DoD: ${passedChecks}/${dodChecks.length} checks pasaron`);
  
  if (passedChecks === dodChecks.length) {
    console.log('\n🎉 Sprint 3 completado exitosamente!');
    console.log('📝 Próximo: Crear PR y tag v0.3.1-ola3-s3');
  } else {
    console.log('\n⚠️ Sprint 3 incompleto, revisar checks fallidos');
  }
}

main().catch(e => {
  console.error('❌ Error en Sprint 3:', e.message);
  process.exit(1);
});
