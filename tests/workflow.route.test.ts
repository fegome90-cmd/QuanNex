import { describe, it, expect } from 'vitest';
import path from 'path';
import { routePlaybook } from '../src/workflow/route.mjs';

function fx(n: string) {
  return path.join(process.cwd(), 'tests/fixtures', n);
}

describe('routePlaybook', () => {
  it('elige plan según perfil', () => {
    const r1 = routePlaybook(fx('react'));
    expect(r1.profile).toBe('react');
    expect(r1.plan.length).toBeGreaterThan(0);
    const r2 = routePlaybook(fx('express'));
    expect(r2.profile).toBe('express');
    expect(r2.plan.length).toBeGreaterThan(0);
  });
});
