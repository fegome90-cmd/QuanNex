import { register, Counter, Histogram } from 'prom-client';

// AutoFix Success Rate
export const autofixSuccessTotal = new Counter({
  name: 'qn_autofix_success_total',
  help: 'Total number of successful AutoFix applications',
  labelNames: ['action_type', 'risk_level'],
});

export const autofixFailureTotal = new Counter({
  name: 'qn_autofix_failure_total', 
  help: 'Total number of failed AutoFix applications',
  labelNames: ['action_type', 'error_type'],
});

// Playbook Match Rate
export const playbookMatchTotal = new Counter({
  name: 'qn_playbook_match_total',
  help: 'Total number of correct playbook matches',
  labelNames: ['profile', 'expected_profile'],
});

export const playbookMismatchTotal = new Counter({
  name: 'qn_playbook_mismatch_total',
  help: 'Total number of incorrect playbook matches', 
  labelNames: ['profile', 'expected_profile'],
});

// Verify Duration
export const verifyDurationSeconds = new Histogram({
  name: 'qn_verify_duration_seconds',
  help: 'Duration of verify command execution',
  labelNames: ['status', 'autofix_applied'],
  buckets: [0.1, 0.5, 1, 2, 5, 10, 30, 60],
});

// Workflow Execution Duration
export const workflowDurationSeconds = new Histogram({
  name: 'qn_workflow_duration_seconds',
  help: 'Duration of adaptive workflow execution',
  labelNames: ['profile', 'status'],
  buckets: [1, 5, 10, 30, 60, 120, 300],
});

// Register metrics
register.registerMetric(autofixSuccessTotal);
register.registerMetric(autofixFailureTotal);
register.registerMetric(playbookMatchTotal);
register.registerMetric(playbookMismatchTotal);
register.registerMetric(verifyDurationSeconds);
register.registerMetric(workflowDurationSeconds);

export function recordAutofixSuccess(actionType, riskLevel) {
  autofixSuccessTotal.inc({ action_type: actionType, risk_level: riskLevel.toString() });
}

export function recordAutofixFailure(actionType, errorType) {
  autofixFailureTotal.inc({ action_type: actionType, error_type: errorType });
}

export function recordPlaybookMatch(profile, expectedProfile) {
  if (profile === expectedProfile) {
    playbookMatchTotal.inc({ profile, expected_profile: expectedProfile });
  } else {
    playbookMismatchTotal.inc({ profile, expected_profile: expectedProfile });
  }
}

export function recordVerifyDuration(status, autofixApplied, duration) {
  verifyDurationSeconds.observe({ status, autofix_applied: autofixApplied.toString() }, duration);
}

export function recordWorkflowDuration(profile, status, duration) {
  workflowDurationSeconds.observe({ profile, status }, duration);
}
