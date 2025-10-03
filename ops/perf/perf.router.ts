import { pickModel } from '../../dist/core/model-router/router.js';

const N = 1_000;
const tasks = [
  { kind: 'code.fix' },
  { kind: 'reasoning.heavy' },
  { kind: 'summarize.long' },
  { kind: 'unknown' },
];

console.time('router');
for (let i = 0; i < N; i++) {
  const task = tasks[i % tasks.length];
  pickModel(task);
}
console.timeEnd('router');
console.log({ N, tasks: tasks.length });
