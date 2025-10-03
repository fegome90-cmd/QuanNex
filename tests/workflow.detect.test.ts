import { describe, it, expect } from 'vitest';
import path from 'path';
import { detectProfile } from '../src/workflow/detect.mjs';

function fx(name: string) {
  return path.join(process.cwd(), 'tests/fixtures', name);
}

describe('detectProfile', () => {
  it('react', () => {
    const r = detectProfile(fx('react'));
    expect(r.profile).toBe('react');
  });
  it('express', () => {
    const r = detectProfile(fx('express'));
    expect(r.profile).toBe('express');
  });
  it('fastapi', () => {
    const r = detectProfile(fx('fastapi'));
    expect(r.profile).toBe('fastapi');
  });
  it('mixed', () => {
    const r = detectProfile(fx('mixed'));
    expect(r.profile).toBe('mixed');
  });
  it('fallback', () => {
    const r = detectProfile(fx('fallback'));
    expect(r.profile).toBe('fallback');
  });
});
