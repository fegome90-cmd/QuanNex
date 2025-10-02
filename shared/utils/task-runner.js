import RouterEngine from './router.js';
import PolicyGate, { PolicyContext, PolicyViolation } from './policy-gate.js';
import buildPolicyContextEnvelope from './build-policy-context.js';
import { sanitizeObject } from './security.js';

const defaultContext = () => ({
  diff: { summary: '', files: [] },
  evidence: { tests: [], lint: [], logs: [] },
  plan: {}
});

export default class TaskRunner {
  constructor({ router, policyGate, orchestrator } = {}) {
    this.router = router || new RouterEngine();
    this.policyGate = policyGate || new PolicyGate();
    this.orchestrator = orchestrator;
    this.rateLimiter = new Map();
    this.rateLimitConfig = {
      windowMs: Number(process.env.TASK_RATE_LIMIT_WINDOW_MS || 60_000),
      maxRequests: Number(process.env.TASK_RATE_LIMIT_MAX_REQUESTS || 60)
    };
  }

  routeTask(task) {
    return this.router.route(task);
  }

  buildPolicyContext({ task = {}, diff, evidence, plan } = {}) {
    const ctx = defaultContext();
    if (diff) ctx.diff = diff;
    if (evidence) ctx.evidence = evidence;
    if (plan) ctx.plan = plan;

    const envelope = buildPolicyContextEnvelope({
      task,
      plan: plan ?? task.plan ?? null
    });

    return new PolicyContext({
      taskId: envelope.taskId,
      requestId: envelope.requestId,
      topic: envelope.topic,
      timestamp: envelope.ts,
      diffSummary: ctx.diff.summary,
      filesChanged: ctx.diff.files || [],
      testEvidence: ctx.evidence.tests || [],
      lintOutput: ctx.evidence.lint || [],
      metadata: envelope.meta,
      plan: envelope.plan,
      meta: envelope.meta
    });
  }

  evaluatePolicies(policyInput) {
    const context = policyInput instanceof PolicyContext ?
      policyInput :
      this.buildPolicyContext(policyInput);
    return this.policyGate.evaluate(context);
  }

  async run(task, options = {}) {
    const sanitizedTask = sanitizeObject(task);
    this.enforceRateLimit(sanitizedTask);
    const routing = this.routeTask(sanitizedTask);

    const response = {
      routing,
      policy: null,
      budget: routing.budget || null,
      execution: null
    };

    if (options.skipPolicy !== true && routing.decision === 'route') {
      try {
        response.policy = this.evaluatePolicies({
          task: sanitizedTask,
          diff: options.diff,
          evidence: options.evidence,
          plan: options.plan
        });
      } catch (error) {
        if (error instanceof PolicyViolation) {
          response.policy = { status: 'rejected', reason: error.message, policy: error.policy };
          response.execution = { status: 'skipped' };
          return response;
        }
        throw error;
      }
    }

    if (!this.orchestrator || routing.decision !== 'route') {
      return response;
    }

    if (!options.workflowId && !options.workflow) {
      response.execution = { status: 'pending', note: 'No workflow provided for execution.' };
      return response;
    }

    if (options.workflowId) {
      if (routing.budget?.constraints) {
        const existing = this.orchestrator.getWorkflow(options.workflowId);
        if (existing) {
          existing.context = existing.context || {};
          existing.context.budget = routing.budget.constraints;
          this.orchestrator.workflows.set(options.workflowId, existing);
        }
      }
      response.execution = await this.orchestrator.executeWorkflow(options.workflowId);
      return response;
    }

    const workflowConfig = JSON.parse(JSON.stringify(options.workflow));
    if (routing.budget?.constraints) {
      workflowConfig.context = workflowConfig.context || {};
      workflowConfig.context.budget = routing.budget.constraints;
    }

    const workflow = await this.orchestrator.createWorkflow(workflowConfig);
    response.execution = await this.orchestrator.executeWorkflow(workflow.workflow_id);
    response.execution.workflow_id = workflow.workflow_id;
    return response;
  }
}
