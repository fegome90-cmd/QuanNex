import { autoFix } from '../../../scripts/autofix.mjs';

export async function toolAutoFix({ actions, dryRun = true, branch } = {}) {
  if (!actions?.length) {
    return { success: false, error: 'no actions' };
  }
  const r = await autoFix({ actions, dryRun, branch });
  return { success: true, report: r };
}
