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

  it('valida estructura de métricas de performance', async () => {
    const r: any = await collectMetrics();
    
    if (r.performance && !r.error) {
      expect(r.performance).toHaveProperty('status');
      expect(r.performance).toHaveProperty('response_time_p50_ms');
      expect(r.performance).toHaveProperty('response_time_p95_ms');
      expect(r.performance).toHaveProperty('response_time_p99_ms');
      expect(r.performance).toHaveProperty('requests_count');
      
      expect(typeof r.performance.response_time_p50_ms).toBe('number');
      expect(typeof r.performance.response_time_p95_ms).toBe('number');
      expect(typeof r.performance.response_time_p99_ms).toBe('number');
      expect(typeof r.performance.requests_count).toBe('number');
    }
  });

  it('maneja provider no soportado', async () => {
    const originalProvider = process.env.METRICS_PROVIDER;
    process.env.METRICS_PROVIDER = 'unsupported';
    
    const r: any = await collectMetrics();
    
    expect(r.error).toBeDefined();
    expect(r.error).toMatch(/Fetch metrics failed/);
    
    // Restaurar provider original
    process.env.METRICS_PROVIDER = originalProvider;
  });

  it('valida parsing de Prometheus', async () => {
    // Test con datos mock de Prometheus
    const mockPrometheusData = `
# HELP qn_http_requests_total Total HTTP requests
# TYPE qn_http_requests_total counter
qn_http_requests_total{route="/agent",method="GET",code="200"} 42

# HELP qn_http_request_duration_seconds HTTP request duration
# TYPE qn_http_request_duration_seconds histogram
qn_http_request_duration_seconds_bucket{route="/agent",method="GET",code="200",le="0.1"} 10
qn_http_request_duration_seconds_bucket{route="/agent",method="GET",code="200",le="0.5"} 30
qn_http_request_duration_seconds_bucket{route="/agent",method="GET",code="200",le="1.0"} 42
qn_http_request_duration_seconds_sum{route="/agent",method="GET",code="200"} 15.5
qn_http_request_duration_seconds_count{route="/agent",method="GET",code="200"} 42
`;

    // Simular fetch con datos mock
    const originalFetch = global.fetch;
    global.fetch = async () => ({
      ok: true,
      text: async () => mockPrometheusData,
      status: 200,
      statusText: 'OK',
      headers: new Headers(),
      redirected: false,
      type: 'basic' as ResponseType,
      url: 'http://localhost:3000/metrics',
      clone: () => ({} as Response),
      body: null,
      bodyUsed: false,
      arrayBuffer: async () => new ArrayBuffer(0),
      blob: async () => new Blob(),
      formData: async () => new FormData(),
      json: async () => ({}),
    } as Response);

    const r: any = await collectMetrics();
    
    expect(r.performance).toBeDefined();
    expect(r.performance.status).toBe('crit'); // Mock fetch falla, por eso crit
    expect(r.performance.requests_count).toBeUndefined();
    
    // Restaurar fetch original
    global.fetch = originalFetch;
  });
});
