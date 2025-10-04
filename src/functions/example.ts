import { withTask, insertEvent } from '../../core/taskdb/withTask';
import { requireTaskContext } from '../../core/taskdb/runtime-guard';

export async function exampleFunction(input: any) {
  return withTask(`FUNC:exampleFunction:${Date.now()}`, { func: 'exampleFunction' }, async (ctx) => {
    // Verificar contexto en funciones críticas
    requireTaskContext();
    
    // Log de entrada
    await insertEvent('guardrail.input', { 
      size: JSON.stringify(input).length,
      timestamp: Date.now()
    });
    
    try {
      // TODO: Implementar lógica de la función
      const result = { ok: true, data: input };
      
      // Log de salida
      await insertEvent('guardrail.output', { 
        success: true,
        timestamp: Date.now()
      });
      
      return result;
    } catch (error) {
      // Log de error
      await insertEvent('guardrail.error', { 
        error: String(error),
        timestamp: Date.now()
      });
      throw error;
    }
  });
}
