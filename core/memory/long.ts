export interface LongAdapter {
  store(rec: any): Promise<void>;
  search(q: string, k?: number): Promise<any[]>;
}

export class LongMemory {
  constructor(private adapter: LongAdapter) {}

  store(content: string, meta: any) {
    return this.adapter.store({ content, meta, ts: Date.now() });
  }

  search(q: string, k = 5) {
    return this.adapter.search(q, k);
  }
}
