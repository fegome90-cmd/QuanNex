import { ShortMemory } from './short.js';
import { LongMemory, LongAdapter } from './long.js';

export class Memory {
  short = new ShortMemory();
  long: LongMemory;

  constructor(adapter: LongAdapter) {
    this.long = new LongMemory(adapter);
  }

  async injectContext(topic: string) {
    const s = this.short
      .query(topic)
      .map(r => r.content)
      .join('\n');
    return s.slice(-4000);
  }
}
