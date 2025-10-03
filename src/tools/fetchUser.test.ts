import { describe, it, expect, vi } from 'vitest';

import { fetchUser } from './fetchUser';

describe('fetchUser', () => {
  it('retorna usuario exitosamente', async () => {
    const mockDb = {
      users: {
        findById: vi.fn().mockResolvedValue({ id: 1, name: 'Felipe', email: 'felipe@example.com' }),
      },
    };

    const result = await fetchUser(mockDb, 1);

    expect(result).toEqual({
      success: true,
      data: { id: 1, name: 'Felipe', email: 'felipe@example.com' },
    });
    expect(mockDb.users.findById).toHaveBeenCalledWith(1);
  });

  it('maneja error de base de datos', async () => {
    const mockDb = {
      users: {
        findById: vi.fn().mockRejectedValue(new Error('Database connection failed')),
      },
    };

    const result = await fetchUser(mockDb, 999);

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/DB fetch failed/);
    expect(result.data).toBeUndefined();
  });

  it('maneja usuario no encontrado', async () => {
    const mockDb = {
      users: {
        findById: vi.fn().mockResolvedValue(null),
      },
    };

    const result = await fetchUser(mockDb, 999);

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/User not found/);
  });

  it('maneja conexión de base de datos inválida', async () => {
    const result = await fetchUser(null as unknown as Database, 1);

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/Invalid database connection/);
  });

  it('maneja estructura de base de datos incompleta', async () => {
    const mockDb = {
      users: null,
    };

    const result = await fetchUser(mockDb as unknown as Database, 1);

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/Invalid database connection/);
  });

  it('maneja timeout de base de datos', async () => {
    const mockDb = {
      users: {
        findById: vi
          .fn()
          .mockImplementation(
            () => new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 100))
          ),
      },
    };

    const result = await fetchUser(mockDb, 1);

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/DB fetch failed/);
  });

  it('valida estructura de respuesta exitosa', async () => {
    const mockDb = {
      users: {
        findById: vi.fn().mockResolvedValue({
          id: 1,
          name: 'Felipe',
          email: 'felipe@example.com',
        }),
      },
    };

    const result = await fetchUser(mockDb, 1);

    expect(result.success).toBe(true);
    expect(result.data).toHaveProperty('id');
    expect(result.data).toHaveProperty('name');
    expect(result.data).toHaveProperty('email');
    expect(result.error).toBeUndefined();
  });
});
