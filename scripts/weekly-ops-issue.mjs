#!/usr/bin/env node
/* eslint-env node */
/* global console, process */

import fs from 'node:fs';
import path from 'node:path';

function generateWeeklyOpsIssue() {
  const date = new Date().toISOString().split('T')[0];
  const baselinePath = 'reports/TASKDB-BASELINE.md';
  
  let baselineContent = '';
  if (fs.existsSync(baselinePath)) {
    baselineContent = fs.readFileSync(baselinePath, 'utf8');
  }
  
  const issueContent = `# Weekly Ops – TaskDB (${date})

## 📊 Baseline Semanal
\`\`\`
${baselineContent.split('\n').slice(0, 20).join('\n')}
\`\`\`

## 🎯 Checklist de Revisión

### Métricas Críticas
- [ ] **Finish Rate**: ≥ 90%
- [ ] **Error Rate**: ≤ 5%
- [ ] **Queue Depth**: p95 < 50
- [ ] **Flush Latency**: p95 < 1s

### Operación
- [ ] **Baseline diario**: Generado automáticamente
- [ ] **Snapshots**: Guardados en reports/metrics-*.prom
- [ ] **Dashboard**: Accesible y actualizado
- [ ] **Alertas**: Umbrales funcionando

### Gobernanza
- [ ] **Instrumentación**: 100% de funciones en src/functions/
- [ ] **CI Gates**: ≥ 95% cumplimiento
- [ ] **Delta PG**: Consistente y estable

## 🔍 Acciones Requeridas

<!-- Dueño rotativo: revisar métricas y dejar 1-2 acciones específicas -->

### Revisión de Umbrales
- [ ] Verificar finish_rate
- [ ] Verificar error_rate
- [ ] Verificar queue_depth
- [ ] Verificar flush_latency

### Revisión de Colas
- [ ] Verificar estabilidad de colas
- [ ] Revisar logs de errores
- [ ] Verificar performance

### Revisión de Fallas
- [ ] Analizar run.error events
- [ ] Revisar gate.fail events
- [ ] Identificar patrones

## 📝 Notas de la Semana

<!-- Documentar observaciones importantes -->

## 🎯 Próximas Acciones

<!-- Listar acciones específicas para la próxima semana -->

---

**Dueño Rotativo**: @[asignar]
**Fecha**: ${date}
**Baseline**: [TASKDB-BASELINE.md](./reports/TASKDB-BASELINE.md)
**Dashboard**: [Grafana](./config/grafana-dashboard-taskdb.json)

⚠️ **Nota Cultural**: Estas métricas son diagnósticas, no se usan para evaluar personas.

*Generado automáticamente por TaskDB v2*
`;

  const issuePath = `reports/weekly-ops-${date}.md`;
  fs.writeFileSync(issuePath, issueContent, 'utf8');
  
  console.log(`✅ Issue semanal generado: ${issuePath}`);
  console.log('💡 Crear issue en GitHub con este contenido');
  
  return issuePath;
}

function main() {
  console.log('📅 Generando Weekly Ops Issue...\n');
  
  try {
    const issuePath = generateWeeklyOpsIssue();
    console.log(`\n📋 Contenido del issue:`);
    console.log('='.repeat(50));
    
    const content = fs.readFileSync(issuePath, 'utf8');
    console.log(content);
    
  } catch (error) {
    console.error('❌ Error generando issue semanal:', error.message);
    process.exit(1);
  }
}

main();
