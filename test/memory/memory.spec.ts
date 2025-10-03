import { describe, it, expect } from 'vitest';
import { Memory } from '../../core/memory';

describe('Memory', () => {
  it('should inject context from short memory', async () => {
    const adapter = {
      store: async () => {},
      search: async () => [{ content: 'hello' }],
    };
    const m = new Memory(adapter as any);

    m.short.push({ content: 'alpha beta', meta: { ts: Date.now() } });
    const result = await m.injectContext('beta');

    expect(result).toContain('beta');
  });

  it('should limit context to 4000 chars', async () => {
    const adapter = {
      store: async () => {},
      search: async () => [],
    };
    const m = new Memory(adapter as any);

    const longContent = 'x'.repeat(5000);
    m.short.push({ content: longContent, meta: { ts: Date.now() } });
    const result = await m.injectContext('x');

    expect(result.length).toBe(4000);
  });

  it('should handle empty short memory', async () => {
    const adapter = {
      store: async () => {},
      search: async () => [],
    };
    const m = new Memory(adapter as any);

    const result = await m.injectContext('anything');
    expect(result).toBe('');
  });

  it('should filter by TTL', async () => {
    const adapter = {
      store: async () => {},
      search: async () => [],
    };
    const m = new Memory(adapter as any);

    // Add old record (expired)
    m.short.push({
      content: 'old content',
      meta: { ts: Date.now() - 8 * 24 * 60 * 60 * 1000 }, // 8 days ago
    });

    // Add recent record
    m.short.push({
      content: 'recent content',
      meta: { ts: Date.now() - 1 * 60 * 60 * 1000 }, // 1 hour ago
    });

    const result = await m.injectContext('content');
    expect(result).toContain('recent content');
    expect(result).not.toContain('old content');
  });
});
