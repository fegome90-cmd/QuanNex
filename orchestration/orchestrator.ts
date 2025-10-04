import { InputGuardrails } from '../core/guardrails/input';
import { OutputGuardrails } from '../core/guardrails/output';
import { pickModel } from '../core/model-router/router';
import { Memory } from '../core/memory';
import { withContext } from '../core/taskdb/context';
import { makeLogger } from '../core/taskdb/logger';
import { makeTaskDBFromEnv } from '../core/taskdb/index';
import { v4 as uuid } from 'uuid';

const inG = new InputGuardrails();
const outG = new OutputGuardrails(20_000);

// TODO: inyecta tu LongAdapter real aquí
const memory = new Memory({
  store: async () => {},
  search: async () => [],
});

const taskdb = makeTaskDBFromEnv();
const logger = makeLogger(taskdb);

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
  return withContext(
    {
      traceId: uuid(),
      runId: uuid(),
      taskId: task.taskId ?? uuid(),
      spanId: uuid(),
      component: 'orchestrator',
      actor: 'cursor',
    },
    async () => {
      const startTime = Date.now();

      try {
        await logger.log('run.start', { kind: task.kind });

        // 1) Guardrails entrada
        inG.validate(task);
        await logger.log('guardrail.input', { ok: true });

        // 2) Memoria
        const ctx = await memory.injectContext(task.topic || task.kind);
        await logger.log('memory.inject', { topic: task.topic || task.kind, contextLength: ctx.length });

        // 3) Router
        const model = pickModel({ kind: task.kind, maxTokens: task.maxTokens });
        await logger.log('router.decision', { model: model.id, reason: model.reason });

        // 4) Llamada LLM
        await logger.log('llm.call', { tokens: task.maxTokens, model: model.id });
        const output = await callLLM(model, { ...task, context: ctx });
        await logger.log('llm.result', { success: true, outputLength: JSON.stringify(output).length });

        // 5) Guardrails salida
        outG.validate(output);
        await logger.log('guardrail.output', { ok: true });

        const duration = Date.now() - startTime;
        await logger.log('run.finish', { ok: true }, 'ok', { durationMs: duration });

        return output;
      } catch (error: any) {
        const duration = Date.now() - startTime;
        await logger.log('run.error', { error: error.message }, 'fail', { durationMs: duration });
        throw error;
      }
    }
  );
}
