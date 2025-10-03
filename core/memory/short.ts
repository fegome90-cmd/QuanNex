export type ShortRec = {
  content: string;
  meta: { ts: number; source?: string; tags?: string[] };
};

export class ShortMemory {
  constructor(
    private cap = 100,
    private ttlMs = 7 * 24 * 60 * 60 * 1000,
    private buf: ShortRec[] = []
  ) {}

  push(r: ShortRec) {
    this.buf.push(r);
    if (this.buf.length > this.cap) this.buf.shift();
  }

  query(q: string) {
    const now = Date.now();
    return this.buf.filter(r => now - r.meta.ts <= this.ttlMs && r.content.includes(q));
  }
}
