/**
 * Obtiene un usuario por ID desde la base de datos
 * @param db - Instancia de base de datos
 * @param userId - ID del usuario a buscar
 * @returns Respuesta estructurada con success/data o error
 */
export async function fetchUser(
  db: { users: { findById: (id: number) => Promise<{ id: number; name: string; email: string }> } },
  userId: number
) {
  try {
    if (!db || !db.users || !db.users.findById) {
      return {
        success: false,
        error: 'Invalid database connection',
      };
    }

    const user = await db.users.findById(userId);

    if (!user) {
      return {
        success: false,
        error: 'User not found',
      };
    }

    return {
      success: true,
      data: {
        id: user.id,
        name: user.name,
        email: user.email,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: `DB fetch failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}
