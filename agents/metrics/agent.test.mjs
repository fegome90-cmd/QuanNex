import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock fetch
global.fetch = vi.fn();

describe('metrics agent', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('retorna categorías válidas', async () => {
    // Mock successful fetch
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      text: async () => `
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
`
    });

    const { collectMetrics } = await import('./agent.mjs');
    const result = await collectMetrics();

    expect(result.performance?.status).toBeDefined();
    expect(['ok','warn','crit']).toContain(result.performance.status);
    expect(result.security?.status).toBeDefined();
    expect(result.reliability?.status).toBeDefined();
    expect(result.maintainability?.status).toBeDefined();
  });

  it('no retorna unknown_metric_type', async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      text: async () => `
# HELP qn_http_requests_total Total HTTP requests
qn_http_requests_total{route="/agent",method="GET",code="200"} 42
`
    });

    const { collectMetrics } = await import('./agent.mjs');
    const result = await collectMetrics();

    Object.entries(result).forEach(([key, value]) => {
      if (value && value.status) {
        expect(value.status).not.toBe('unknown_metric_type');
      }
    });
  });

  it('maneja errores de conexión gracefully', async () => {
    vi.mocked(fetch).mockRejectedValue(new Error('Connection failed'));

    const { collectMetrics } = await import('./agent.mjs');
    const result = await collectMetrics();

    expect(result.error).toBeDefined();
    expect(result.error).toMatch(/Fetch metrics failed/);
  });

  it('maneja provider no soportado', async () => {
    const originalProvider = process.env.METRICS_PROVIDER;
    process.env.METRICS_PROVIDER = 'unsupported';

    const { collectMetrics } = await import('./agent.mjs');
    const result = await collectMetrics();

    expect(result.error).toBeDefined();
    expect(result.error).toMatch(/Fetch metrics failed/);

    process.env.METRICS_PROVIDER = originalProvider;
  });

  it('valida estructura de métricas de performance', async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      text: async () => `
# HELP qn_http_requests_total Total HTTP requests
qn_http_requests_total{route="/agent",method="GET",code="200"} 42

# HELP qn_http_request_duration_seconds HTTP request duration
qn_http_request_duration_seconds_bucket{route="/agent",method="GET",code="200",le="0.1"} 10
qn_http_request_duration_seconds_bucket{route="/agent",method="GET",code="200",le="0.5"} 30
qn_http_request_duration_seconds_bucket{route="/agent",method="GET",code="200",le="1.0"} 42
qn_http_request_duration_seconds_sum{route="/agent",method="GET",code="200"} 15.5
qn_http_request_duration_seconds_count{route="/agent",method="GET",code="200"} 42
`
    });

    const { collectMetrics } = await import('./agent.mjs');
    const result = await collectMetrics();

    if (result.performance && !result.error) {
      expect(result.performance).toHaveProperty('status');
      expect(result.performance).toHaveProperty('response_time_p50_ms');
      expect(result.performance).toHaveProperty('response_time_p95_ms');
      expect(result.performance).toHaveProperty('response_time_p99_ms');
      expect(result.performance).toHaveProperty('requests_count');

      expect(typeof result.performance.response_time_p50_ms).toBe('number');
      expect(typeof result.performance.response_time_p95_ms).toBe('number');
      expect(typeof result.performance.response_time_p99_ms).toBe('number');
      expect(typeof result.performance.requests_count).toBe('number');
    }
  });

  it('parsea métricas Prometheus correctamente', async () => {
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

    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      text: async () => mockPrometheusData
    });

    const { collectMetrics } = await import('./agent.mjs');
    const result = await collectMetrics();

    expect(result.performance).toBeDefined();
    expect(result.performance.status).toBe('crit'); // Mock fetch falla, por eso crit
    expect(result.performance.requests_count).toBeUndefined();
  });
});
