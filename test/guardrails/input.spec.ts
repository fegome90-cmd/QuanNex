import { describe, it, expect } from 'vitest';
import { InputGuardrails } from '../../core/guardrails/input';

describe('InputGuardrails', () => {
  it('should validate valid input', () => {
    expect(() =>
      new InputGuardrails().validate({
        budget: 500000,
        maxTokens: 2000,
        text: 'ok',
      })
    ).not.toThrow();
  });

  it('should reject budget too low', () => {
    expect(() => new InputGuardrails(1_000_000, 10_000).validate({ budget: 1000 })).toThrow();
  });

  it('should reject budget too high', () => {
    expect(() => new InputGuardrails(1_000_000, 10_000).validate({ budget: 2_000_000 })).toThrow();
  });

  it('should reject maxTokens too high', () => {
    expect(() => new InputGuardrails().validate({ maxTokens: 10000 })).toThrow();
  });

  it('should reject empty text', () => {
    expect(() => new InputGuardrails().validate({ text: '' })).toThrow();
  });

  it('should accept valid partial input', () => {
    expect(() => new InputGuardrails().validate({ budget: 50000 })).not.toThrow();
    expect(() => new InputGuardrails().validate({ maxTokens: 1000 })).not.toThrow();
    expect(() => new InputGuardrails().validate({ text: 'valid text' })).not.toThrow();
  });
});
