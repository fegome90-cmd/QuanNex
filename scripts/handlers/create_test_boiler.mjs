import fs from 'fs';
import path from 'path';

/**
 * Handler para crear boilerplate de tests mínimos
 * Genera tests básicos para archivos sin cobertura
 */
export async function createTestBoiler({ filePath, testFramework = 'vitest' }) {
  try {
    // Determinar el archivo de test correspondiente
    const ext = path.extname(filePath);
    const baseName = path.basename(filePath, ext);
    const dir = path.dirname(filePath);

    const testFileName = `${baseName}.test${ext}`;
    const testFilePath = path.join(dir, testFileName);

    // Verificar si ya existe el test
    if (fs.existsSync(testFilePath)) {
      return { stdout: `Test file already exists: ${testFilePath}` };
    }

    // Generar contenido del test según el framework
    let testContent;
    if (testFramework === 'vitest') {
      testContent = generateVitestBoiler(filePath, baseName);
    } else if (testFramework === 'jest') {
      testContent = generateJestBoiler(filePath, baseName);
    } else {
      testContent = generateGenericBoiler(filePath, baseName);
    }

    // Crear directorio si no existe
    fs.mkdirSync(path.dirname(testFilePath), { recursive: true });

    // Escribir archivo de test
    fs.writeFileSync(testFilePath, testContent);

    return {
      stdout: `Created test boilerplate: ${testFilePath}`,
      testFile: testFilePath,
      framework: testFramework,
    };
  } catch (error) {
    return {
      stdout: `Failed to create test boilerplate for ${filePath}: ${error.message}`,
      error: error.message,
    };
  }
}

function generateVitestBoiler(filePath, baseName) {
  return `import { describe, it, expect } from 'vitest';
import { ${baseName} } from './${baseName}';

describe('${baseName}', () => {
  it('should be defined', () => {
    expect(${baseName}).toBeDefined();
  });

  it('should have expected interface', () => {
    // TODO: Add specific tests based on ${baseName} functionality
    expect(typeof ${baseName}).toBe('function');
  });
});
`;
}

function generateJestBoiler(filePath, baseName) {
  return `describe('${baseName}', () => {
  it('should be defined', () => {
    expect(${baseName}).toBeDefined();
  });

  it('should have expected interface', () => {
    // TODO: Add specific tests based on ${baseName} functionality
    expect(typeof ${baseName}).toBe('function');
  });
});
`;
}

function generateGenericBoiler(filePath, baseName) {
  return `// Test boilerplate for ${baseName}
// TODO: Add proper test cases

describe('${baseName}', () => {
  it('should be defined', () => {
    // TODO: Implement test
  });
});
`;
}

// Detectar archivos sin cobertura
export async function detectUncoveredFiles() {
  try {
    // Buscar archivos .ts/.js en src/ que no tengan tests
    const srcFiles = [];

    function findFiles(dir) {
      const files = fs.readdirSync(dir);

      for (const file of files) {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);

        if (stat.isDirectory()) {
          findFiles(filePath);
        } else if (file.endsWith('.ts') || file.endsWith('.js')) {
          const testFile = filePath.replace(/\.(ts|js)$/, '.test.$1');
          if (!fs.existsSync(testFile)) {
            srcFiles.push(filePath);
          }
        }
      }
    }

    if (fs.existsSync('src')) {
      findFiles('src');
    }

    return srcFiles;
  } catch (error) {
    return [];
  }
}

// Auto-crear tests para archivos sin cobertura
export async function autoCreateTests() {
  const uncoveredFiles = await detectUncoveredFiles();
  const results = [];

  for (const filePath of uncoveredFiles) {
    const result = await createTestBoiler({ filePath });
    results.push(result);
  }

  return results;
}
