import { describe, it, expect } from 'vitest';

import { add } from './add';

describe('add', () => {
  it('suma enteros', () => {
    expect(add(2, 3)).toBe(5);
  });

  it('suma negativos', () => {
    expect(add(-2, -3)).toBe(-5);
  });

  it('suma cero', () => {
    expect(add(0, 5)).toBe(5);
    expect(add(5, 0)).toBe(5);
  });

  it('suma decimales', () => {
    expect(add(1.5, 2.5)).toBe(4);
  });
});
