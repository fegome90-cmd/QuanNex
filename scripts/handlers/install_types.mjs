import fs from 'fs';
import { execSync } from 'node:child_process';

/**
 * Handler para instalar tipos TypeScript faltantes
 * Detecta imports de paquetes sin @types/* y los instala automáticamente
 */
export async function installTypes({ packageName, dev = true }) {
  try {
    // Verificar si ya tiene tipos instalados
    const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
    const typesPackage = `@types/${packageName}`;

    const hasTypes = pkg.dependencies?.[typesPackage] || pkg.devDependencies?.[typesPackage];
    if (hasTypes) {
      return { stdout: `Types for ${packageName} already installed` };
    }

    // Instalar tipos
    const installCmd = `npm install ${dev ? '-D' : ''} ${typesPackage}`;
    const result = execSync(installCmd, { stdio: 'pipe' }).toString();

    return {
      stdout: `Installed ${typesPackage} for ${packageName}`,
      installed: typesPackage,
      dev,
    };
  } catch (error) {
    return {
      stdout: `Failed to install types for ${packageName}: ${error.message}`,
      error: error.message,
    };
  }
}

// Auto-detección de tipos faltantes
export async function detectMissingTypes() {
  try {
    const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
    const allDeps = { ...pkg.dependencies, ...pkg.devDependencies };

    const missingTypes = [];

    for (const [depName, version] of Object.entries(allDeps)) {
      // Skip si ya es un paquete de tipos
      if (depName.startsWith('@types/')) continue;

      // Skip paquetes que no necesitan tipos
      if (['typescript', 'vitest', 'jest', 'eslint'].includes(depName)) continue;

      const typesPackage = `@types/${depName}`;
      if (!allDeps[typesPackage]) {
        missingTypes.push(depName);
      }
    }

    return missingTypes;
  } catch (error) {
    return [];
  }
}
