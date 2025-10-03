import { runAdaptive } from '../../../src/workflow/run.mjs';

export async function toolAdaptiveRun() {
  const r = await runAdaptive();
  return { success: true, ...r };
}
