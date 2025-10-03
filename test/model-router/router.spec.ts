import { describe, it, expect } from 'vitest';
import { pickModel } from '../../core/model-router/router';

describe('Model Router', () => {
  it('should route code.fix to gpt-4o-mini', () => {
    const result = pickModel({ kind: 'code.fix' });
    expect(result.id).toBe('gpt-4o-mini');
    expect(result.maxTokens).toBe(2048);
    expect(result.temperature).toBe(0.3);
  });

  it('should route unknown kind to fallback', () => {
    const result = pickModel({ kind: 'unknown' });
    expect(result.id).toBe('gpt-4o');
  });

  it('should use custom maxTokens when provided', () => {
    const result = pickModel({ kind: 'code.fix', maxTokens: 1000 });
    expect(result.maxTokens).toBe(1000);
  });

  it('should route reasoning.heavy to gpt-5-thinking', () => {
    const result = pickModel({ kind: 'reasoning.heavy' });
    expect(result.id).toBe('gpt-5-thinking');
  });

  it('should route summarize.long to claude-3.7-sonnet', () => {
    const result = pickModel({ kind: 'summarize.long' });
    expect(result.id).toBe('claude-3.7-sonnet');
  });

  it('should include reason in result', () => {
    const result = pickModel({ kind: 'code.fix' });
    expect(result.reason).toBeDefined();
    expect(typeof result.reason).toBe('string');
  });
});
