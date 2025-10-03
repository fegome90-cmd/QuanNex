import { Memory } from '../../dist/core/memory/index.js';

const adapter = {
  store: async () => {},
  search: async () => [{ content: 'test content' }],
};
const m = new Memory(adapter as any);

// Pre-populate short memory
for (let i = 0; i < 50; i++) {
  m.short.push({
    content: `test content ${i}`,
    meta: { ts: Date.now(), tags: ['test'] },
  });
}

const N = 100;

console.time('memory');
for (let i = 0; i < N; i++) {
  await m.injectContext('test');
}
console.timeEnd('memory');
console.log({ N });
