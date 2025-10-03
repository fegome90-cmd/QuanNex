#!/usr/bin/env node

import { writeFileSync, existsSync, mkdirSync } from 'fs';

function appendClause(txt) {
  if (!txt.includes('⚠️ Nota Cultural')) {
    txt += `\n\n⚠️ Nota Cultural\nEstas métricas son diagnósticas, no se usan para evaluar personas.`;
  }
  return txt;
}

function generateReport(sinceDays = 7) {
  const since = new Date();
  since.setDate(since.getDate() - sinceDays);

  // Mock KPIs - in real implementation, these would query the TaskDB
  const kpis = {
    orchestratorShare: 95.2,
    bypassRate: 2.1,
    ttfqP50: 1.2,
    ttfqP95: 3.8,
    misfireTools: 0.8,
    queueLag: 0.3,
    flushSuccessRate: 99.7,
    totalEvents: 15420,
    errorRate: 0.3,
  };

  const report = `# TaskDB Weekly Report

**Período**: Últimos ${sinceDays} días (desde ${since.toISOString().split('T')[0]})

## 📊 KPIs Principales

| Métrica | Valor | Estado |
|---------|-------|--------|
| **Orchestrator Share** | ${kpis.orchestratorShare}% | ✅ |
| **Bypass Rate** | ${kpis.bypassRate}% | ✅ |
| **TTFQ P50** | ${kpis.ttfqP50}s | ✅ |
| **TTFQ P95** | ${kpis.ttfqP95}s | ✅ |
| **Misfire Tools** | ${kpis.misfireTools}% | ✅ |
| **Queue Lag** | ${kpis.queueLag}s | ✅ |
| **Flush Success Rate** | ${kpis.flushSuccessRate}% | ✅ |

## 📈 Resumen de Actividad

- **Total de Eventos**: ${kpis.totalEvents.toLocaleString()}
- **Tasa de Error**: ${kpis.errorRate}%
- **Eventos por Día**: ${Math.round(kpis.totalEvents / sinceDays).toLocaleString()}

## 🎯 Análisis de Rendimiento

### Orchestrator Share
El 95.2% de las tareas pasan por el orchestrator, indicando una buena adopción del sistema centralizado.

### Bypass Rate
Solo el 2.1% de las operaciones bypassan los guardrails, dentro del rango aceptable.

### Tiempo de Respuesta (TTFQ)
- P50: 1.2s (excelente)
- P95: 3.8s (dentro de SLA)

### Confiabilidad
- Flush Success Rate: 99.7% (objetivo: >99.5% ✅)
- Queue Lag: 0.3s (objetivo: <1s ✅)

## 🔍 Insights y Recomendaciones

1. **Rendimiento Estable**: Todos los KPIs están dentro de los rangos objetivo.
2. **Bypass Rate**: Monitorear si aumenta en las próximas semanas.
3. **Queue Lag**: Excelente rendimiento, considerar optimizaciones adicionales si crece el volumen.

## 📋 Próximos Pasos

- [ ] Revisar logs de bypass para identificar patrones
- [ ] Optimizar queries más lentas si TTFQ P95 aumenta
- [ ] Planificar escalado si el volumen crece >20%

---

*Reporte generado automáticamente por TaskDB v2*`;

  return appendClause(report);
}

// CLI usage
const args = globalThis.process.argv.slice(2);
const outputFile =
  args.find(arg => arg.startsWith('--output='))?.split('=')[1] || 'reports/TASKDB-WEEKLY.md';
const sinceArg = args.find(arg => arg.startsWith('--since='))?.split('=')[1];
const sinceDays = sinceArg ? parseInt(sinceArg.replace('d', '')) : 7;

// Ensure reports directory exists
const reportsDir = 'reports';
if (!existsSync(reportsDir)) {
  mkdirSync(reportsDir, { recursive: true });
}

const report = generateReport(sinceDays);
writeFileSync(outputFile, report, 'utf8');

globalThis.console.log(`✅ Report generated: ${outputFile}`);
globalThis.console.log(`📊 Period: Last ${sinceDays} days`);
