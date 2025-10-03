import { ReviewIssue } from '../../cli/types';

type Cfg = {
  structure?: { required?: string[] };
};

export function structure(doc: string, cfg?: Cfg): ReviewIssue[] {
  const issues: ReviewIssue[] = [];
  const required = cfg?.structure?.required ?? [
    '^#\\s+',
    '^##\\s+Resumen',
    '^##\\s+Hallazgos',
    '^##\\s+Métricas',
  ];
  for (let idx = 0; idx < required.length; idx++) {
    const re = new RegExp(required[idx], 'm');
    if (!re.test(doc)) {
      issues.push({
        id: `ST-${100 + idx}`,
        type: 'structure',
        severity: 'low',
        message: `Falta sección requerida: ${required[idx]}`,
      });
    }
  }
  return issues;
}
