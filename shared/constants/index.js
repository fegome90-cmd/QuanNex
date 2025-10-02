/**
 * shared/constants/index.js
 * Constantes compartidas
 */
export const DEFAULT_TIMEOUT_MS = 30000;
export const MAX_HOPS = 6;
export const CANARY_PERCENTAGE = 20;
export const CACHE_TTL_MS = 30000;

export const FEATURE_FLAGS = {
  ROUTER_V2: 'FEATURE_ROUTER_V2',
  FSM_V2: 'FEATURE_FSM_V2',
  CANARY: 'FEATURE_CANARY',
  MONITORING: 'FEATURE_MONITORING',
  CONTEXT_V2: 'FEATURE_CONTEXT_V2',
  HANDOFF: 'FEATURE_HANDOFF'
};
