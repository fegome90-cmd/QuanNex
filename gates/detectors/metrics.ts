import { ReviewIssue } from '../../cli/types';
import * as fs from 'node:fs';

export function metrics(doc: string, metricsPath: string): ReviewIssue[] {
  const issues: ReviewIssue[] = [];

  try {
    if (!fs.existsSync(metricsPath)) {
      issues.push({
        id: 'MT-001',
        type: 'metrics',
        severity: 'medium',
        message: `Archivo de métricas no encontrado: ${metricsPath}`,
      });
      return issues;
    }

    const metricsData = JSON.parse(fs.readFileSync(metricsPath, 'utf-8'));

    // Buscar números en el documento que deberían tener métricas correspondientes
    const numberMatches = doc.match(/\b\d{2,}\b/g);

    if (numberMatches) {
      const hasMetrics = numberMatches.some(num => {
        // Verificar si el número aparece en las métricas
        const metricsStr = JSON.stringify(metricsData);
        return metricsStr.includes(num);
      });

      if (!hasMetrics) {
        issues.push({
          id: 'MT-002',
          type: 'metrics',
          severity: 'low',
          message: 'Números en el documento no encontrados en métricas de referencia',
        });
      }
    }
  } catch (error: any) {
    issues.push({
      id: 'MT-003',
      type: 'metrics',
      severity: 'high',
      message: `Error procesando métricas: ${error.message}`,
    });
  }

  return issues;
}
