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

  it('suma números grandes', () => {
    expect(add(1000000, 2000000)).toBe(3000000);
  });

  it('suma números muy pequeños', () => {
    expect(add(0.0001, 0.0002)).toBeCloseTo(0.0003, 5);
  });

  it('maneja números con precisión flotante', () => {
    expect(add(0.1, 0.2)).toBeCloseTo(0.3, 10);
  });

  it('suma números mixtos (positivo y negativo)', () => {
    expect(add(5, -3)).toBe(2);
    expect(add(-5, 3)).toBe(-2);
  });

  it('suma números iguales', () => {
    expect(add(5, 5)).toBe(10);
    expect(add(-5, -5)).toBe(-10);
  });

  it('maneja valores especiales de JavaScript', () => {
    expect(add(NaN, 5)).toBeNaN();
    expect(add(5, NaN)).toBeNaN();
    expect(add(Infinity, 5)).toBe(Infinity);
    expect(add(5, Infinity)).toBe(Infinity);
    expect(add(-Infinity, 5)).toBe(-Infinity);
  });
});
