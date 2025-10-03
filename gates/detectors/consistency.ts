import { ReviewIssue } from '../../cli/types';

type Cfg = {
  headings?: { resumen?: string; total?: string };
};

export function consistency(doc: string, cfg?: Cfg): ReviewIssue[] {
  const issues: ReviewIssue[] = [];
  const resPat = cfg?.headings?.resumen ?? 'Resumen';
  const totPat = cfg?.headings?.total ?? 'Total';

  const resRe = new RegExp(`${resPat}(?:.|[\\r\\n])*?(\\d{2,})`, 'i');
  const totRe = new RegExp(`${totPat}(?:.|[\\r\\n])*?(\\d{2,})`, 'i');
  const mSum = doc.match(resRe);
  const mBody = doc.match(totRe);

  if (mSum && mBody && mSum[1] !== mBody[1]) {
    issues.push({
      id: 'CN-001',
      type: 'consistency',
      severity: 'medium',
      message: `Inconsistencia: ${resPat} dice ${mSum[1]} y ${totPat} dice ${mBody[1]}.`,
    });
  }
  return issues;
}
