import { CircuitBreaker } from '../state/circuitBreaker';

type MetricPoint = { ts: number; name: string; value: number };
type Source = 'live' | 'demo' | 'cache';

const DEFAULT_ENDPOINT = (globalThis as any).__METRICS_URL__ ?? '';

export class MetricsClient {
  private cb = new CircuitBreaker(3, 15000);
  private cache: MetricPoint[] = [];
  private demoMode = false;

  constructor(private endpoint = DEFAULT_ENDPOINT) {
    if (!this.endpoint) this.demoMode = true;
  }

  // policy-allow:timer (browser-only) — ver policy.config.json
  private async sleep(ms: number) {
    await new Promise(r => setTimeout(r, ms));
  }

  private async fetchOnce(signal: AbortSignal): Promise<{ source: Source; data: MetricPoint[] }> {
    if (this.demoMode) {
      const now = Date.now();
      const data = Array.from({ length: 5 }, (_, i) => ({
        ts: now - i * 1000,
        name: 'wca_latency_ms',
        value: 300 + Math.round(Math.random() * 80),
      }));
      this.cache = data;
      return { source: 'demo', data };
    }

    const res = await fetch(this.endpoint + '/metrics', {
      signal,
      headers: { Accept: 'application/json' },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = (await res.json()) as MetricPoint[];
    this.cache = data;
    return { source: 'live', data };
  }

  async getMetrics(): Promise<{ source: Source; data: MetricPoint[] }> {
    const now = Date.now();
    if (!this.cb.canRequest(now)) {
      // OPEN → servir cache o demo, nunca buclear
      return { source: this.demoMode ? 'demo' : 'cache', data: this.cache };
    }

    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 3500); // timeout duro
    try {
      if (this.cb.getState() === 'OPEN') this.cb.halfOpen();
      const res = await this.fetchOnce(ctrl.signal);
      this.cb.onSuccess();
      clearTimeout(t);
      return res;
    } catch (err) {
      clearTimeout(t);
      this.cb.onFailure();
      // fallback sin recursión: no reintenta en caliente; espera coolDown
      return { source: this.demoMode ? 'demo' : 'cache', data: this.cache };
    }
  }
}
