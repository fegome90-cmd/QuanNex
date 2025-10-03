import { register, Counter, Histogram, Summary } from 'prom-client';

/**
 * Optimized AutoFix Metrics with reduced cardinality
 * - Whitelisted label values to prevent explosion
 * - Aggregated metrics where possible
 * - Removed dynamic labels that could cause cardinality issues
 */

// Whitelisted values for labels to prevent cardinality explosion
const ALLOWED_ACTION_TYPES = [
  'install_missing_dep',
  'fix_import_path', 
  'add_npm_script',
  'apply_lint_fix',
  'format_fix',
  'create_config_file',
  'install_types',
  'update_script',
  'create_test_boiler',
  'other'
];

const ALLOWED_ERROR_TYPES = [
  'policy_violation',
  'handler_missing',
  'execution_error',
  'timeout',
  'other'
];

const ALLOWED_PROFILES = [
  'react',
  'express', 
  'fastapi',
  'mixed',
  'fallback',
  'unknown'
];

const ALLOWED_STATUS = ['success', 'failure', 'timeout'];

// Helper function to normalize label values
function normalizeActionType(actionType) {
  return ALLOWED_ACTION_TYPES.includes(actionType) ? actionType : 'other';
}

function normalizeErrorType(errorType) {
  if (!errorType || typeof errorType !== 'string') return 'other';
  
  // Map common error types to whitelisted values
  if (errorType.includes('policy') || errorType.includes('permitido')) return 'policy_violation';
  if (errorType.includes('handler') || errorType.includes('faltante')) return 'handler_missing';
  if (errorType.includes('timeout')) return 'timeout';
  if (errorType.includes('execution') || errorType.includes('exec')) return 'execution_error';
  return 'other';
}

function normalizeProfile(profile) {
  return ALLOWED_PROFILES.includes(profile) ? profile : 'unknown';
}

// AutoFix Success Rate (simplified)
export const autofixSuccessTotal = new Counter({
  name: 'qn_autofix_success_total',
  help: 'Total number of successful AutoFix applications',
  labelNames: ['action_type'], // Removed risk_level to reduce cardinality
});

export const autofixFailureTotal = new Counter({
  name: 'qn_autofix_failure_total', 
  help: 'Total number of failed AutoFix applications',
  labelNames: ['error_type'], // Removed action_type to reduce cardinality
});

// AutoFix Risk Distribution (histogram instead of labels)
export const autofixRiskHistogram = new Histogram({
  name: 'qn_autofix_risk_distribution',
  help: 'Distribution of risk levels in AutoFix operations',
  buckets: [0, 1, 2, 3, 4, 5, 10], // Fixed buckets
});

// Playbook Match Rate (simplified)
export const playbookMatchTotal = new Counter({
  name: 'qn_playbook_match_total',
  help: 'Total number of correct playbook matches',
  labelNames: ['profile'], // Removed expected_profile to reduce cardinality
});

export const playbookMismatchTotal = new Counter({
  name: 'qn_playbook_mismatch_total',
  help: 'Total number of incorrect playbook matches', 
  labelNames: ['profile'], // Removed expected_profile to reduce cardinality
});

// Verify Duration (simplified)
export const verifyDurationSeconds = new Histogram({
  name: 'qn_verify_duration_seconds',
  help: 'Duration of verify command execution',
  labelNames: ['status'], // Removed autofix_applied to reduce cardinality
  buckets: [0.1, 0.5, 1, 2, 5, 10, 30, 60], // Fixed buckets
});

// Workflow Execution Duration (simplified)
export const workflowDurationSeconds = new Histogram({
  name: 'qn_workflow_duration_seconds',
  help: 'Duration of adaptive workflow execution',
  labelNames: ['profile', 'status'],
  buckets: [1, 5, 10, 30, 60, 120, 300], // Fixed buckets
});

// AutoFix Operations Summary (new aggregated metric)
export const autofixOperationsSummary = new Summary({
  name: 'qn_autofix_operations_summary',
  help: 'Summary of AutoFix operations (count, duration, risk)',
  labelNames: ['operation_type'], // success, failure, timeout
  percentiles: [0.5, 0.9, 0.95, 0.99],
});

// Metrics are automatically registered when created
// No need to manually register them

// Optimized recording functions
export function recordAutofixSuccess(actionType, riskLevel) {
  const normalizedActionType = normalizeActionType(actionType);
  const normalizedRiskLevel = typeof riskLevel === 'number' ? riskLevel : 0;
  autofixSuccessTotal.inc({ action_type: normalizedActionType });
  autofixRiskHistogram.observe(normalizedRiskLevel);
  autofixOperationsSummary.observe({ operation_type: 'success' }, 1);
}

export function recordAutofixFailure(actionType, errorType) {
  const normalizedErrorType = normalizeErrorType(errorType);
  autofixFailureTotal.inc({ error_type: normalizedErrorType });
  autofixOperationsSummary.observe({ operation_type: 'failure' }, 1);
}

export function recordPlaybookMatch(profile, expectedProfile) {
  const normalizedProfile = normalizeProfile(profile);
  
  if (profile === expectedProfile) {
    playbookMatchTotal.inc({ profile: normalizedProfile });
  } else {
    playbookMismatchTotal.inc({ profile: normalizedProfile });
  }
}

export function recordVerifyDuration(status, autofixApplied, duration) {
  const normalizedStatus = ALLOWED_STATUS.includes(status) ? status : 'other';
  const normalizedDuration = typeof duration === 'number' ? duration : 0;
  verifyDurationSeconds.observe({ status: normalizedStatus }, normalizedDuration);
}

export function recordWorkflowDuration(profile, status, duration) {
  const normalizedProfile = normalizeProfile(profile);
  const normalizedStatus = ALLOWED_STATUS.includes(status) ? status : 'other';
  const normalizedDuration = typeof duration === 'number' ? duration : 0;
  workflowDurationSeconds.observe({ profile: normalizedProfile, status: normalizedStatus }, normalizedDuration);
}

// New function to record operation summary
export function recordAutofixOperation(operationType, duration, riskLevel) {
  const normalizedType = ALLOWED_STATUS.includes(operationType) ? operationType : 'other';
  const normalizedRiskLevel = typeof riskLevel === 'number' ? riskLevel : 0;
  const normalizedDuration = typeof duration === 'number' ? duration : 0;
  autofixOperationsSummary.observe({ operation_type: normalizedType }, normalizedDuration);
  autofixRiskHistogram.observe(normalizedRiskLevel);
}

// Health check function
export function getMetricsHealth() {
  const metrics = register.getMetricsAsJSON();
  const metricsArray = Object.values(metrics);
  const seriesCount = metricsArray.reduce((total, metric) => {
    if (metric.values) {
      return total + metric.values.length;
    }
    return total;
  }, 0);
  
  
  return {
    totalSeries: seriesCount,
    maxRecommendedSeries: 1000, // Conservative limit
    isHealthy: seriesCount < 1000,
    metrics: metricsArray.map(m => ({
      name: m.name,
      type: m.type,
      seriesCount: m.values ? m.values.length : 0
    })),
    metricNames: metricsArray.map(m => m.name)
  };
}
