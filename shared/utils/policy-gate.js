import { minimatch } from 'minimatch';

export class PolicyViolation extends Error {
  constructor(message, policy) {
    super(message);
    this.name = 'PolicyViolation';
    this.policy = policy;
  }
}

export class PolicyContext {
  constructor({
    taskId = 'unknown',
    requestId = null,
    topic = null,
    timestamp = null,
    diffSummary = '',
    filesChanged = [],
    testEvidence = [],
    lintOutput = [],
    metadata = {},
    plan = null,
    meta = null
  } = {}) {
    this.taskId = taskId;
    this.requestId = requestId;
    this.topic = topic;
    this.timestamp = timestamp;
    this.diffSummary = diffSummary;
    this.filesChanged = filesChanged;
    this.testEvidence = testEvidence;
    this.lintOutput = lintOutput;
    this.plan = plan;
    this.meta = meta ?? metadata;
    this.metadata = this.meta;
  }
}

class BasePolicy {
  constructor({ name, description }) {
    this.name = name;
    this.description = description;
  }

  evaluate() {
    throw new Error('evaluate() must be implemented by subclasses');
  }
}

class BlockSensitiveFilesPolicy extends BasePolicy {
  constructor() {
    super({
      name: 'block_sensitive_files',
      description: 'Prevent modifications to CI and security-critical files without override.'
    });
    this.protectedGlobs = ['.github/**', 'core/scripts/**', 'policies/**'];
  }

  evaluate(context) {
    const hits = context.filesChanged.filter(path =>
      this.protectedGlobs.some(pattern => minimatch(path, pattern, { dot: true }))
    );
    if (hits.length > 0) {
      throw new PolicyViolation(
        `Protected files touched: ${hits.join(', ')}. Request manual approval.`,
        this.name
      );
    }
  }
}

class RequireRegressionReferencePolicy extends BasePolicy {
  constructor() {
    super({
      name: 'require_regression_reference',
      description: 'Bug fixes must reference failing test or reproduction notes.'
    });
  }

  evaluate(context) {
    if (context.metadata.intent === 'bugfix' && !context.metadata.regression_reference) {
      throw new PolicyViolation('Missing regression reference for bug fix task.', this.name);
    }
  }
}

class RequireEvidenceForLintFixesPolicy extends BasePolicy {
  constructor() {
    super({
      name: 'require_lint_evidence',
      description: 'Lint fixes must include before/after or tool output excerpt.'
    });
  }

  evaluate(context) {
    if (context.metadata.intent === 'lint' && context.lintOutput.length === 0) {
      throw new PolicyViolation('Lint fix missing tool output evidence.', this.name);
    }
  }
}

class RequireTestProofPolicy extends BasePolicy {
  constructor() {
    super({
      name: 'require_test_proof',
      description: 'Code changes altering logic must include test results.'
    });
  }

  evaluate(context) {
    if (
      ['refactor', 'bugfix'].includes(context.metadata.intent) &&
      context.testEvidence.length === 0
    ) {
      throw new PolicyViolation('Test evidence required for refactor/bugfix tasks.', this.name);
    }
  }
}

export default class PolicyGate {
  constructor(policies) {
    this.policies = policies || [
      new BlockSensitiveFilesPolicy(),
      new RequireRegressionReferencePolicy(),
      new RequireEvidenceForLintFixesPolicy(),
      new RequireTestProofPolicy()
    ];
  }

  evaluate(rawContext) {
    const context = rawContext instanceof PolicyContext ?
      rawContext :
      new PolicyContext(rawContext);

    for (const policy of this.policies) {
      policy.evaluate(context);
    }

    return { status: 'approved', policyCount: this.policies.length };
  }
}
