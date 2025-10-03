import { InputGuardrails } from '../../dist/core/guardrails/input.js';

const g = new InputGuardrails();
const N = 10_000;
let ok = 0;

console.time('guardrails');
for (let i = 0; i < N; i++) {
  try {
    g.validate({ budget: 500000, maxTokens: 2000, text: 'x' });
    ok++;
  } catch {}
}
console.timeEnd('guardrails');
console.log({ ok, N });
