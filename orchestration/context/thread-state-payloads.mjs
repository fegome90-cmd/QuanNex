/**
 * ThreadState payload builders for QuanNex autonomous workflow.
 */

function normalizeEvidence(evidence = {}) {
  const normalized = {};
  if (Array.isArray(evidence.tests) && evidence.tests.length > 0) {
    normalized.tests = evidence.tests;
  }
  if (Array.isArray(evidence.lint) && evidence.lint.length > 0) {
    normalized.lint = evidence.lint;
  }
  if (Array.isArray(evidence.logs) && evidence.logs.length > 0) {
    normalized.logs = evidence.logs;
  }
  return normalized;
}

export function buildThreadStatePayload({
  threadStateId,
  intent,
  confidence,
  files,
  diffSummary,
  evidence,
  artifacts
}) {
  return {
    threadStateId,
    intent,
    confidence,
    files: files || [],
    diffSummary: diffSummary || '',
    evidence: normalizeEvidence(evidence),
    artifacts: artifacts || {}
  };
}

export function buildTestContextPayload({
  threadStateId,
  files,
  recommendedCommands,
  failingTests,
  artifacts
}) {
  return {
    threadStateId,
    intent: 'test',
    confidence: 1,
    files: files || [],
    diffSummary: artifacts?.diffSummary || '',
    evidence: normalizeEvidence({
      tests: recommendedCommands,
      logs: failingTests
    }),
    artifacts: artifacts || {}
  };
}

export function buildLightPayload({
  threadStateId,
  intent,
  files,
  note
}) {
  return {
    threadStateId,
    intent,
    confidence: 1,
    files: files || [],
    diffSummary: note || '',
    evidence: {},
    artifacts: {}
  };
}

export function buildRagPayload({
  threadStateId,
  query,
  topFiles,
  embeddingsRef
}) {
  const files = Array.isArray(topFiles) ? topFiles : [];
  return {
    threadStateId,
    intent: 'rag',
    confidence: 0.9,
    files: files.map(path => ({ path, status: 'modified', summary: 'context' })),
    diffSummary: query || '',
    evidence: {},
    artifacts: embeddingsRef ? { embeddingsRef } : {}
  };
}

export const payloadBuilders = {
  build_thread_state_payload: buildThreadStatePayload,
  build_test_context_payload: buildTestContextPayload,
  build_light_payload: buildLightPayload,
  build_rag_payload: buildRagPayload
};

export default payloadBuilders;
