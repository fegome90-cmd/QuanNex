export type CBState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

export class CircuitBreaker {
  private state: CBState = 'CLOSED';
  private failures = 0;
  private readonly threshold: number;
  private nextTryAt = 0;
  private readonly coolDownMs: number;

  constructor(threshold = 3, coolDownMs = 15000) {
    this.threshold = threshold;
    this.coolDownMs = coolDownMs;
  }

  canRequest(now = Date.now()) {
    if (this.state === 'OPEN') return now >= this.nextTryAt;
    return true;
  }

  onSuccess() {
    this.state = 'CLOSED';
    this.failures = 0;
  }

  onFailure(now = Date.now()) {
    this.failures += 1;
    if (this.failures >= this.threshold) {
      this.state = 'OPEN';
      // backoff exponencial con jitter
      const base = this.coolDownMs * 2 ** (this.failures - this.threshold);
      const jitter = Math.floor(Math.random() * 0.25 * base);
      this.nextTryAt = now + base + jitter;
    }
  }

  halfOpen() {
    this.state = 'HALF_OPEN';
  }
  getState() {
    return this.state;
  }
}
