import { describe, it, expect } from 'vitest';
import { OutputGuardrails } from '../../core/guardrails/output';

describe('OutputGuardrails', () => {
  it('should validate valid output', () => {
    const og = new OutputGuardrails(1000);
    expect(() => og.validate({ ok: true, data: { x: 1 } })).not.toThrow();
  });

  it('should reject output missing required fields', () => {
    const og = new OutputGuardrails(1000);
    expect(() => og.validate({ ok: true })).toThrow();
  });

  it('should reject output too long', () => {
    const og = new OutputGuardrails(10);
    const longOutput = { ok: true, data: 'x'.repeat(20) };
    expect(() => og.validate(longOutput)).toThrow();
  });

  it('should accept valid string output', () => {
    const og = new OutputGuardrails(1000);
    expect(() => og.validate(JSON.stringify({ ok: true, data: 'test' }))).not.toThrow();
  });

  it('should reject invalid JSON', () => {
    const og = new OutputGuardrails(1000);
    expect(() => og.validate('invalid json')).toThrow();
  });

  it('should accept output with meta field', () => {
    const og = new OutputGuardrails(1000);
    expect(() =>
      og.validate({
        ok: true,
        data: 'test',
        meta: { timestamp: Date.now() },
      })
    ).not.toThrow();
  });
});
