#!/usr/bin/env node
/**
 * File System Sandbox con protección contra path traversal
 */
import fs from 'node:fs/promises';
import path from 'node:path';

const ROOT = process.cwd();

/**
 * Valida que una ruta esté dentro del directorio raíz
 * @param {string} p - Ruta a validar
 * @returns {string} Ruta absoluta segura
 * @throws {Error} Si la ruta está fuera del sandbox
 */
function safe(p) {
  const abs = path.resolve(ROOT, p);
  if (!abs.startsWith(ROOT)) {
    throw new Error('E_PATH_TRAVERSAL: Path outside sandbox');
  }
  return abs;
}

/**
 * Lee un archivo de forma segura
 * @param {string} p - Ruta del archivo
 * @param {string} enc - Codificación (default: utf8)
 * @returns {Promise<string|Buffer>} Contenido del archivo
 */
export const readFileSafe = (p, enc = 'utf8') => fs.readFile(safe(p), enc);

/**
 * Escribe un archivo de forma segura
 * @param {string} p - Ruta del archivo
 * @param {string|Buffer} data - Datos a escribir
 * @param {string} enc - Codificación (default: utf8)
 * @returns {Promise<void>}
 */
export const writeFileSafe = (p, data, enc = 'utf8') => fs.writeFile(safe(p), data, enc);

/**
 * Verifica si un archivo existe de forma segura
 * @param {string} p - Ruta del archivo
 * @returns {Promise<boolean>} True si existe
 */
export const existsSafe = (p) => fs.access(safe(p)).then(() => true).catch(() => false);

/**
 * Lee un directorio de forma segura
 * @param {string} p - Ruta del directorio
 * @returns {Promise<string[]>} Lista de archivos
 */
export const readDirSafe = (p) => fs.readdir(safe(p));

/**
 * Crea un directorio de forma segura
 * @param {string} p - Ruta del directorio
 * @param {object} options - Opciones de creación
 * @returns {Promise<void>}
 */
export const mkdirSafe = (p, options = {}) => fs.mkdir(safe(p), { recursive: true, ...options });

/**
 * Elimina un archivo de forma segura
 * @param {string} p - Ruta del archivo
 * @returns {Promise<void>}
 */
export const unlinkSafe = (p) => fs.unlink(safe(p));

/**
 * Obtiene estadísticas de un archivo de forma segura
 * @param {string} p - Ruta del archivo
 * @returns {Promise<object>} Estadísticas del archivo
 */
export const statSafe = (p) => fs.stat(safe(p));

/**
 * Valida múltiples rutas de forma segura
 * @param {string[]} paths - Rutas a validar
 * @returns {string[]} Rutas absolutas seguras
 * @throws {Error} Si alguna ruta está fuera del sandbox
 */
export function validatePaths(paths) {
  return paths.map(p => safe(p));
}

/**
 * Verifica si una ruta está dentro del sandbox
 * @param {string} p - Ruta a verificar
 * @returns {boolean} True si está dentro del sandbox
 */
export function isPathSafe(p) {
  try {
    safe(p);
    return true;
  } catch (e) {
    return false;
  }
}

export default {
  readFileSafe,
  writeFileSafe,
  existsSafe,
  readDirSafe,
  mkdirSafe,
  unlinkSafe,
  statSafe,
  validatePaths,
  isPathSafe
};
