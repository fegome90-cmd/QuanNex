import { routePlaybook } from '../../../src/workflow/route.mjs';

export async function toolDetectRoute() {
  const r = routePlaybook();
  return { success: true, ...r };
}
