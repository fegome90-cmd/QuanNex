#!/usr/bin/env node
/**
 * orchestrator.js - Punto de entrada StartKit QuanNex
 * Selecciona la versión correcta basada en VERSION env var
 */
import { fileURLToPath } from 'url';
import { dirname, join } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Detectar versión
const version = process.env.VERSION || process.env.FEATURE_VERSION || 'latest';
let resolvedVersion = version;
let versionPath = join(__dirname, 'versions', resolvedVersion);

if (!existsSync(join(versionPath, 'orchestrator.js'))) {
  if (resolvedVersion === 'latest') {
    // Intentar leer manifest para determinar versión actual
    try {
      const manifest = JSON.parse(
        readFileSync(join(__dirname, 'versions', 'manifest.json'), 'utf8')
      );
      if (manifest?.latest?.target) {
        resolvedVersion = manifest.latest.target;
      } else if (manifest?.default) {
        resolvedVersion = manifest.default;
      } else {
        resolvedVersion = 'v3';
      }
    } catch {
      resolvedVersion = 'v3';
    }
    versionPath = join(__dirname, 'versions', resolvedVersion);
  }
}

console.log(`🚀 StartKit QuanNex Orchestrator ${version} (resuelto a ${resolvedVersion})`);
console.log(`📁 Cargando desde: ${versionPath}`);

// Importar la versión correcta
try {
  const { Orchestrator } = await import(join(versionPath, 'orchestrator.js'));
  const orchestrator = new Orchestrator();
  await orchestrator.start();
} catch (error) {
  console.error(`❌ Error cargando versión ${version}:`, error.message);
  console.error(`💡 Versiones disponibles: v1, v2, v3, latest`);
  process.exit(1);
}
