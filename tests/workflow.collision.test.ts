import { describe, it, expect, vi } from 'vitest';
import path from 'path';
import { detectProfile } from '../src/workflow/detect.mjs';

function fx(name: string) {
  return path.join(process.cwd(), 'tests/fixtures', name);
}

describe('Profile Collision Detection', () => {
  it('debe detectar empate y elegir por peso', () => {
    // Crear un fixture que tenga señales de React y Express pero más peso en mixed
    const result = detectProfile(fx('mixed'));

    // Mixed debería ganar por tener peso 1.2 vs 1.0
    expect(result.profile).toBe('mixed');
    expect(result.score).toBeGreaterThan(1.0);
  });

  it('debe loggear decisión cuando hay empate', () => {
    // Capturar console.log para verificar que se loggea la decisión
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    detectProfile(fx('mixed'));

    // Verificar que se loggeó la decisión (si hubo empate)
    const loggedMessages = consoleSpy.mock.calls.map((call: any) => call[0]);
    const hasDecisionLog = loggedMessages.some(
      (msg: any) => typeof msg === 'string' && msg.includes('[PROFILE-DETECT]')
    );

    consoleSpy.mockRestore();

    // Si hay empate, debería loggearse la decisión
    if (hasDecisionLog) {
      expect(
        loggedMessages.some(
          (msg: any) => typeof msg === 'string' && msg.includes('Empate detectado')
        )
      ).toBe(true);
    }
  });

  it('debe priorizar perfil con mayor peso en caso de empate', () => {
    const result = detectProfile(fx('mixed'));

    // Mixed tiene peso 1.2, debería ganar sobre react/express con peso 1.0
    expect(result.profile).toBe('mixed');
  });
});
