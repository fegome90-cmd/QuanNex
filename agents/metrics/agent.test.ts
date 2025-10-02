import { describe, it, expect } from 'vitest';
import { collectMetrics } from './agent.mjs';

describe('metrics agent', () => {
  it('retorna categorías válidas', async () => {
    const r: any = await collectMetrics();
    
    // Verificar que todas las categorías tienen status definido
    expect(r.performance?.status).toBeDefined();
    expect(['ok','warn','crit']).toContain(r.performance.status);
    
    expect(r.security?.status).toBeDefined();
    expect(['ok','warn','crit']).toContain(r.security.status);
    
    expect(r.reliability?.status).toBeDefined();
    expect(['ok','warn','crit']).toContain(r.reliability.status);
    
    expect(r.maintainability?.status).toBeDefined();
    expect(['ok','warn','crit']).toContain(r.maintainability.status);
  });
  
  it('no retorna unknown_metric_type', async () => {
    const r: any = await collectMetrics();
    
    // Verificar que no hay unknown_metric_type
    Object.entries(r).forEach(([key, value]: [string, any]) => {
      if (value && value.status) {
        expect(value.status).not.toBe('unknown_metric_type');
      }
    });
  });
  
  it('maneja errores de conexión gracefully', async () => {
    // Simular error de conexión
    const originalUrl = process.env.METRICS_URL;
    process.env.METRICS_URL = 'http://localhost:9999/metrics';
    
    const r: any = await collectMetrics();
    
    // Debería retornar error en lugar de crashear
    expect(r.error).toBeDefined();
    
    // Restaurar URL original
    process.env.METRICS_URL = originalUrl;
  });
});
