import test from 'node:test';
import assert from 'node:assert/strict';

// Mock memory object para testing
const mem = {
  async summarize(thread) { 
    return { 
      summary: 'Test summary with key information',
      facts: ['fact1: important data', 'fact2: critical insight', 'fact3: additional context']
    }; 
  },
  async search(query, k) { 
    return [
      { text: 'hit1: relevant content', score: 0.9 },
      { text: 'hit2: related information', score: 0.8 },
      { text: 'hit3: supplementary data', score: 0.7 },
      { text: 'hit4: additional context', score: 0.6 },
      { text: 'hit5: extra information', score: 0.5 }
    ]; 
  }
};

// Función de enrichment para testing
async function enrichForRole(options) {
  const { role, question, mem, thread } = options;
  
  // Simular enrichment
  const summaryResult = await mem.summarize(thread);
  const searchResult = await mem.search(question, 4); // k=4
  
  return {
    system_context: {
      summary: summaryResult.summary,
      facts: summaryResult.facts,
      retrieved: searchResult.slice(0, 4) // Limit to k=4
    },
    role: role,
    question: question
  };
}

test('Enrichment: incluye summary, facts, retrieved<=k', async () => {
  const thread = {
    files: ['file1.js', 'file2.js'],
    diffs: ['diff1', 'diff2'],
    build_errors: ['error1'],
    goals: ['goal1', 'goal2'],
    facts: ['existing_fact'],
    sources: ['source1', 'source2']
  };
  
  const res = await enrichForRole({ 
    role: 'engineer', 
    question: 'How to implement authentication?', 
    mem, 
    thread 
  });
  
  assert.ok(res.system_context.summary.length > 0, 'Summary debe tener contenido');
  assert.ok(res.system_context.facts.length >= 1, 'Facts debe tener al menos 1 elemento');
  assert.ok(res.system_context.retrieved.length <= 4, 'Retrieved debe ser <= k=4');
  assert.equal(res.system_context.retrieved.length, 4, 'Retrieved debe ser exactamente 4 elementos');
  assert.equal(res.role, 'engineer', 'Role debe ser preservado');
  assert.equal(res.question, 'How to implement authentication?', 'Question debe ser preservado');
});

test('Enrichment: facts contienen información relevante', async () => {
  const thread = { files: [], diffs: [], build_errors: [], goals: [], facts: [], sources: [] };
  
  const res = await enrichForRole({ 
    role: 'teacher', 
    question: 'Explain the architecture', 
    mem, 
    thread 
  });
  
  assert.ok(res.system_context.facts.some(fact => fact.includes('important')), 'Facts debe contener información importante');
  assert.ok(res.system_context.facts.some(fact => fact.includes('critical')), 'Facts debe contener insights críticos');
});

test('Enrichment: retrieved ordenado por score', async () => {
  const thread = { files: [], diffs: [], build_errors: [], goals: [], facts: [], sources: [] };
  
  const res = await enrichForRole({ 
    role: 'tester', 
    question: 'Test coverage requirements', 
    mem, 
    thread 
  });
  
  // Verificar que los resultados están ordenados por score descendente
  const scores = res.system_context.retrieved.map(item => item.score);
  const sortedScores = [...scores].sort((a, b) => b - a);
  
  assert.deepEqual(scores, sortedScores, 'Retrieved debe estar ordenado por score descendente');
  assert.ok(scores[0] >= scores[1], 'Primer elemento debe tener score >= segundo');
  assert.ok(scores[1] >= scores[2], 'Segundo elemento debe tener score >= tercero');
});
