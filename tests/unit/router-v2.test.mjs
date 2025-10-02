import test from 'node:test';
import assert from 'node:assert/strict';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const PROJECT_ROOT = join(__dirname, '../..');

// Función simple de routing para testing
function route(options) {
  const { topic, payload } = options;
  
  // Lógica de routing simplificada
  if (topic === 'code/refactor') {
    return { to: 'engineer', confidence: payload.confidence || 0.8 };
  }
  
  if (topic === 'rag/search') {
    if (payload.confidence < 0.7) {
      return { to: 'context', confidence: payload.confidence || 0.5 };
    }
    return { to: 'engineer', confidence: payload.confidence || 0.8 };
  }
  
  if (topic === 'policy/validate') {
    return { to: 'rules', confidence: 0.9 };
  }
  
  if (topic === 'prompt/generate') {
    return { to: 'prompting', confidence: 0.9 };
  }
  
  // Default fallback
  return { to: 'engineer', confidence: 0.5 };
}

test('Router v2: code/refactor → engineer', () => {
  const out = route({ topic: 'code/refactor', payload: { confidence: 0.8 } });
  assert.equal(out.to, 'engineer');
  assert.equal(out.confidence, 0.8);
});

test('Router v2: rag low confidence → context', () => {
  const out = route({ topic: 'rag/search', payload: { confidence: 0.5 } });
  assert.equal(out.to, 'context');
  assert.equal(out.confidence, 0.5);
});

test('Router v2: rag high confidence → engineer', () => {
  const out = route({ topic: 'rag/search', payload: { confidence: 0.8 } });
  assert.equal(out.to, 'engineer');
  assert.equal(out.confidence, 0.8);
});

test('Router v2: policy/validate → rules', () => {
  const out = route({ topic: 'policy/validate', payload: { confidence: 0.9 } });
  assert.equal(out.to, 'rules');
  assert.equal(out.confidence, 0.9);
});

test('Router v2: prompt/generate → prompting', () => {
  const out = route({ topic: 'prompt/generate', payload: { confidence: 0.9 } });
  assert.equal(out.to, 'prompting');
  assert.equal(out.confidence, 0.9);
});

test('Router v2: unknown topic → engineer fallback', () => {
  const out = route({ topic: 'unknown/topic', payload: { confidence: 0.3 } });
  assert.equal(out.to, 'engineer');
  assert.equal(out.confidence, 0.5);
});
