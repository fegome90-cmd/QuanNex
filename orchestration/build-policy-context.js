import { createHash } from 'node:crypto';
import deepMergeSafe from './utils/deep-merge-safe.js';
import deepFreeze from './utils/deep-freeze.js';

const DEFAULT_META_KEYS = new Set([
  'intent',
  'regression_reference',
  'ticket_id',
  'risk_level',
  'component',
  'owner',
  'labels'
]);

export function buildPolicyContext({ task = {}, plan = null, now } = {}) {
  const timestamp = now || new Date().toISOString();

  const safePlan = plan ? deepFreeze(clonePlan(plan)) : null;

  const planMeta = sanitizeMeta(plan?.metadata || {});
  const taskMeta = sanitizeMeta(task?.metadata || {});

  const metaPrecedenceTask = taskMetaIsPreferred();
  const mergedMeta = metaPrecedenceTask ?
    deepMergeSafe({}, planMeta, taskMeta) :
    deepMergeSafe({}, taskMeta, planMeta);

  const envelope = {
    taskId: task.task_id || task.id || 'unknown',
    requestId: task.requestId,
    topic: task.topic,
    ts: timestamp,
    plan: safePlan,
    meta: mergedMeta
  };

  if (debugLoggingEnabled()) {
    const planHash = safePlan ? shortHash(safePlan) : null;
    const metaKeys = Object.keys(mergedMeta);
    console.debug('[policy-context]', {
      precedence: metaPrecedenceTask ? 'task_over_plan' : 'plan_over_task',
      keys: metaKeys,
      planHash
    });
  }

  return envelope;
}

function sanitizeMeta(source) {
  const output = {};
  for (const [key, value] of Object.entries(source || {})) {
    if (!DEFAULT_META_KEYS.has(key)) continue;
    if (!isPlainValue(value)) continue;
    output[key] = value;
  }
  return output;
}

function isPlainValue(value) {
  const type = typeof value;
  return value == null || type === 'string' || type === 'number' || type === 'boolean';
}

export default buildPolicyContext;

function clonePlan(plan) {
  if (typeof structuredClone === 'function') {
    return structuredClone(plan);
  }
  return JSON.parse(JSON.stringify(plan));
}

function shortHash(value) {
  const serialized = JSON.stringify(value);
  return createHash('sha1').update(serialized).digest('hex').slice(0, 8);
}

function taskMetaIsPreferred() {
  return process.env.TASK_META_OVER_PLAN !== '0';
}

function debugLoggingEnabled() {
  return process.env.DEBUG_POLICY_CONTEXT === '1';
}
