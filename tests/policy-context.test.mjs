import test from 'node:test';
import assert from 'node:assert/strict';

import buildPolicyContext from './orchestration/build-policy-context.js';
import { PolicyContext } from './orchestration/policy-gate.js';

const plan = {
  steps: [{ id: 's1', action: 'apply_patch' }],
  metadata: {
    intent: 'refactor',
    regression_reference: 'ABC-123',
    owner: 'planner'
  }
};

const task = {
  requestId: 'r-1',
  topic: 'code/refactor',
  metadata: {
    intent: 'refactor',
    labels: 'hotfix',
    owner: 'devA'
  }
};

test('merge incluye task.metadata sin pisar plan', () => {
  const ctx = buildPolicyContext({ task, plan, now: '2025-10-01T15:00:00Z' });
  assert.equal(ctx.plan.steps[0].action, 'apply_patch');
  assert.equal(ctx.meta.intent, 'refactor');
  assert.equal(ctx.meta.regression_reference, 'ABC-123');
  assert.equal(ctx.meta.owner, 'devA');
  assert.equal(ctx.meta.labels, 'hotfix');
  assert.equal(ctx.ts, '2025-10-01T15:00:00Z');
});

test('sanitize ignora claves fuera de whitelist', () => {
  const dirtyTask = {
    metadata: {
      intent: 'bugfix',
      __proto__: 'x',
      secret: 'no'
    }
  };
  const ctx = buildPolicyContext({ task: dirtyTask, plan: null, now: 'x' });
  assert.equal(ctx.meta.intent, 'bugfix');
  assert.ok(!Object.prototype.hasOwnProperty.call(ctx.meta, '__proto__'));
  assert.equal(ctx.meta.secret, undefined);
});

test('plan es inmutable', () => {
  const planCopy = { steps: [{ a: 1 }], metadata: { intent: 'refactor' } };
  const ctx = buildPolicyContext({ task: {}, plan: planCopy, now: 'x' });
  assert.throws(() => {
    ctx.plan.steps.push({ b: 2 });
  }, TypeError);
  assert.equal(planCopy.steps.length, 1);
});

test('precedencia respetada segun flag (task sobre plan)', () => {
  const original = process.env.TASK_META_OVER_PLAN;
  process.env.TASK_META_OVER_PLAN = '1';
  const planMeta = { metadata: { owner: 'planner' } };
  const taskMeta = { metadata: { owner: 'devA' } };
  try {
    const ctx = buildPolicyContext({ task: taskMeta, plan: planMeta, now: 'x' });
    assert.equal(ctx.meta.owner, 'devA');
  } finally {
    if (original === undefined) {
      delete process.env.TASK_META_OVER_PLAN;
    } else {
      process.env.TASK_META_OVER_PLAN = original;
    }
  }
});

test('precedencia respetada segun flag (plan sobre task)', () => {
  const original = process.env.TASK_META_OVER_PLAN;
  process.env.TASK_META_OVER_PLAN = '0';
  const planMeta = { metadata: { owner: 'planner' } };
  const taskMeta = { metadata: { owner: 'devA' } };
  try {
    const ctx = buildPolicyContext({ task: taskMeta, plan: planMeta, now: 'x' });
    assert.equal(ctx.meta.owner, 'planner');
  } finally {
    if (original === undefined) {
      delete process.env.TASK_META_OVER_PLAN;
    } else {
      process.env.TASK_META_OVER_PLAN = original;
    }
  }
});

test('alias metadata apunta a meta', () => {
  const envelope = buildPolicyContext({
    task: { metadata: { intent: 'bugfix' } },
    plan: {},
    now: 'x'
  });
  const ctx = new PolicyContext({ metadata: envelope.meta, meta: envelope.meta });
  assert.equal(ctx.metadata.intent, 'bugfix');
  assert.strictEqual(ctx.metadata, ctx.meta);
});
