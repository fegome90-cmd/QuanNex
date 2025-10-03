import { InputGuardrails } from '../core/guardrails/input';
import { OutputGuardrails } from '../core/guardrails/output';
import { pickModel } from '../core/model-router/router';
import { Memory } from '../core/memory';

const inG = new InputGuardrails();
const outG = new OutputGuardrails(20_000);

// TODO: inyecta tu LongAdapter real aquí
const memory = new Memory({
  store: async () => {},
  search: async () => [],
});

// Mock LLM call - replace with your actual LLM implementation
async function callLLM(model: any, task: any): Promise<any> {
  // This is a placeholder - implement your actual LLM call here
  return {
    ok: true,
    data: `Response for ${task.kind} using ${model.id}`,
    meta: { model: model.id, timestamp: Date.now() },
  };
}

export async function executeTask(task: any) {
  // 1) Guardrails entrada
  inG.validate(task);

  // 2) Memoria
  const ctx = await memory.injectContext(task.topic || task.kind);

  // 3) Router
  const model = pickModel({ kind: task.kind, maxTokens: task.maxTokens });

  // 4) Llamada LLM
  const output = await callLLM(model, { ...task, context: ctx });

  // 5) Guardrails salida
  outG.validate(output);

  return output;
}
