import { ReviewIssue } from '../../cli/types';

type Cfg = {
  factcheck?: {
    require_citation_near?: { units?: string; window?: number };
    ignore_years?: boolean;
    min_digits?: number;
  };
};

export function factcheck(doc: string, cfg?: Cfg): ReviewIssue[] {
  const issues: ReviewIssue[] = [];
  const lines = doc.split(/\r?\n/);

  const minDigits = cfg?.factcheck?.min_digits ?? 3; // 3+ dígitos: 100, 2500, etc.
  const requireUnits = cfg?.factcheck?.require_citation_near?.units ?? '(%|USD|EUR|CLP)';
  const window = cfg?.factcheck?.require_citation_near?.window ?? 30;
  const ignoreYears = cfg?.factcheck?.ignore_years ?? true;

  const numRe = new RegExp(`\\b\\d{${minDigits},}\\b`);
  const unitsRe = new RegExp(requireUnits, 'i');
  const citationRe = /\[\d+\]|\(ref:[^)]+\)|\[ref:[^\]]+\]/i;

  lines.forEach((line, i) => {
    // saltar años comunes
    if (ignoreYears && /\b(19|20)\d{2}\b/.test(line)) return;

    // detectar número "grande"
    const m = line.match(numRe);
    if (!m) return;

    // ¿hay unidades/porcentaje cerca?
    const idx = m.index ?? 0;
    const left = line.slice(Math.max(0, idx - window), idx);
    const right = line.slice(idx + m[0].length, idx + m[0].length + window);
    const hasUnit = unitsRe.test(left) || unitsRe.test(right);

    if (hasUnit && !citationRe.test(line)) {
      issues.push({
        id: 'FC-001',
        type: 'factcheck',
        severity: 'high',
        message: 'Dato cuantitativo con unidad/porcentaje sin cita cercana.',
        where: `line:${i + 1}`,
      });
    }
  });

  return issues;
}
