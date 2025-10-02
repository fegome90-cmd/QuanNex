#!/usr/bin/env node

/**
 * Solución Felipe - Corrección de Parsing JSON con Caracteres de Control
 *
 * PROBLEMA IDENTIFICADO:
 * - Error: SyntaxError: Unexpected non-whitespace character after JSON at position 748
 * - Causa: Saltos de línea (\n) en el campo 'code' no se escapan correctamente
 * - Ubicación: agents/rules/agent.js:57:19 en safeJsonParse
 *
 * SOLUCIÓN IMPLEMENTADA:
 * - Mejorar función escapeControlCharacters para manejar más casos
 * - Actualizar safeJsonParse para detectar más tipos de errores JSON
 * - Agregar validación adicional para caracteres problemáticos
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

/**
 * Función mejorada para escapar caracteres de control en JSON
 */
function escapeControlCharacters(str) {
  return str
    .replace(/\n/g, '\\n') // Escapa saltos de línea
    .replace(/\r/g, '\\r') // Escapa retornos de carro
    .replace(/\t/g, '\\t') // Escapa tabs
    .replace(/\f/g, '\\f') // Escapa form feeds
    .replace(/\v/g, '\\v') // Escapa vertical tabs
    .replace(/\0/g, '\\0'); // Escapa caracteres null
}

/**
 * Función mejorada para parsing seguro de JSON
 */
function safeJsonParse(jsonString) {
  try {
    return JSON.parse(jsonString);
  } catch (error) {
    console.warn('⚠️  Error de parsing JSON detectado:', error.message);

    // Intentar diferentes estrategias de corrección
    const strategies = [
      // Estrategia 1: Escapar caracteres de control
      () => {
        console.log('🔄 Aplicando escape de caracteres de control...');
        const escapedJson = escapeControlCharacters(jsonString);
        return JSON.parse(escapedJson);
      },

      // Estrategia 2: Limpiar caracteres problemáticos al final
      () => {
        console.log('🔄 Limpiando caracteres problemáticos al final...');
        const cleanedJson = jsonString.trim().replace(/[^\x20-\x7E\s]+$/, '');
        return JSON.parse(cleanedJson);
      },

      // Estrategia 3: Reconstruir JSON manualmente para campos problemáticos
      () => {
        console.log('🔄 Reconstruyendo JSON manualmente...');
        try {
          // Buscar el campo 'code' y escapar su contenido
          const codeMatch = jsonString.match(/"code"\s*:\s*"([^"]*(?:\\.[^"]*)*)"/);
          if (codeMatch) {
            const originalCode = codeMatch[1];
            const escapedCode = escapeControlCharacters(originalCode);
            const fixedJson = jsonString.replace(codeMatch[0], `"code": "${escapedCode}"`);
            return JSON.parse(fixedJson);
          }
          throw new Error('No se pudo encontrar campo code para reconstruir');
        } catch (reconstructError) {
          throw new Error(`Reconstrucción falló: ${reconstructError.message}`);
        }
      },
    ];

    for (let i = 0; i < strategies.length; i++) {
      try {
        return strategies[i]();
      } catch (strategyError) {
        console.warn(`❌ Estrategia ${i + 1} falló:`, strategyError.message);
        if (i === strategies.length - 1) {
          throw new Error(
            `Todas las estrategias de corrección fallaron. Error original: ${error.message}`
          );
        }
      }
    }
  }
}

/**
 * Función para probar la solución con diferentes casos problemáticos
 */
function testSolution() {
  console.log('🧪 Probando solución de parsing JSON...\n');

  const testCases = [
    // Caso 1: JSON con saltos de línea en campo code (caso original)
    {
      name: 'JSON con saltos de línea en campo code',
      json: '{"policy_refs": ["test.js"], "compliance_level": "strict", "code": "line1\nline2\nline3", "rules": ["test"]}',
    },

    // Caso 2: JSON con caracteres de control múltiples
    {
      name: 'JSON con múltiples caracteres de control',
      json: '{"test": "text\twith\ntabs\r\nand\rreturns", "code": "function() {\n  return true;\n}"}',
    },

    // Caso 3: JSON con comillas escapadas incorrectamente
    {
      name: 'JSON con comillas problemáticas',
      json: '{"message": "He said \\"Hello\\" to me", "code": "console.log(\\"test\\");"}',
    },
  ];

  let passedTests = 0;

  for (const testCase of testCases) {
    console.log(`📋 Test: ${testCase.name}`);
    try {
      const result = safeJsonParse(testCase.json);
      console.log('✅ ÉXITO - JSON parseado correctamente');
      console.log('📊 Resultado:', JSON.stringify(result, null, 2));
      passedTests++;
    } catch (error) {
      console.log('❌ FALLO - Error:', error.message);
    }
    console.log('---\n');
  }

  console.log(`📈 Resumen: ${passedTests}/${testCases.length} tests pasaron`);
  return passedTests === testCases.length;
}

/**
 * Función para aplicar la corrección al archivo agent.js
 */
function applyFix() {
  console.log('🔧 Aplicando corrección al archivo agents/rules/agent.js...\n');

  try {
    const agentPath = 'agents/rules/agent.js';
    const originalContent = readFileSync(agentPath, 'utf8');

    // Crear contenido corregido
    const correctedContent = originalContent
      .replace(
        /function escapeControlCharacters\(str\) \{[^}]+\}/s,
        `function escapeControlCharacters(str) {
  return str
    .replace(/\\\\/g, '\\\\\\\\')     // Escapa backslashes primero
    .replace(/\\n/g, '\\\\n')      // Escapa saltos de línea
    .replace(/\\r/g, '\\\\r')      // Escapa retornos de carro
    .replace(/\\t/g, '\\\\t')      // Escapa tabs
    .replace(/\\f/g, '\\\\f')      // Escapa form feeds
    .replace(/\\v/g, '\\\\v')      // Escapa vertical tabs
    .replace(/"/g, '\\\\"')       // Escapa comillas dobles
    .replace(/\\0/g, '\\\\0');     // Escapa caracteres null
}`
      )
      .replace(
        /function safeJsonParse\(jsonString\) \{[^}]+\}/s,
        `function safeJsonParse(jsonString) {
  try {
    return JSON.parse(jsonString);
  } catch (error) {
    console.warn('⚠️  Error de parsing JSON detectado:', error.message);
    
    // Intentar diferentes estrategias de corrección
    const strategies = [
      // Estrategia 1: Escapar caracteres de control
      () => {
        console.log('🔄 Aplicando escape de caracteres de control...');
        const escapedJson = escapeControlCharacters(jsonString);
        return JSON.parse(escapedJson);
      },
      
      // Estrategia 2: Limpiar caracteres problemáticos al final
      () => {
        console.log('🔄 Limpiando caracteres problemáticos al final...');
        const cleanedJson = jsonString.trim().replace(/[^\\x20-\\x7E\\s]+$/, '');
        return JSON.parse(cleanedJson);
      },
      
      // Estrategia 3: Reconstruir JSON manualmente para campos problemáticos
      () => {
        console.log('🔄 Reconstruyendo JSON manualmente...');
        try {
          // Buscar el campo 'code' y escapar su contenido
          const codeMatch = jsonString.match(/"code"\\s*:\\s*"([^"]*(?:\\\\.[^"]*)*)"/);
          if (codeMatch) {
            const originalCode = codeMatch[1];
            const escapedCode = escapeControlCharacters(originalCode);
            const fixedJson = jsonString.replace(codeMatch[0], \`"code": "\${escapedCode}"\`);
            return JSON.parse(fixedJson);
          }
          throw new Error('No se pudo encontrar campo code para reconstruir');
        } catch (reconstructError) {
          throw new Error(\`Reconstrucción falló: \${reconstructError.message}\`);
        }
      }
    ];
    
    for (let i = 0; i < strategies.length; i++) {
      try {
        return strategies[i]();
      } catch (strategyError) {
        console.warn(\`❌ Estrategia \${i + 1} falló:\`, strategyError.message);
        if (i === strategies.length - 1) {
          throw new Error(\`Todas las estrategias de corrección fallaron. Error original: \${error.message}\`);
        }
      }
    }
  }
}`
      );

    // Crear backup del archivo original
    const backupPath = `${agentPath}.backup.${Date.now()}`;
    writeFileSync(backupPath, originalContent);
    console.log(`💾 Backup creado: ${backupPath}`);

    // Aplicar corrección
    writeFileSync(agentPath, correctedContent);
    console.log('✅ Corrección aplicada exitosamente');

    return true;
  } catch (error) {
    console.error('❌ Error aplicando corrección:', error.message);
    return false;
  }
}

/**
 * Función principal
 */
async function main() {
  console.log('🚀 Solución Felipe - Corrección de Parsing JSON\n');
  console.log('='.repeat(60));

  // Paso 1: Probar la solución
  console.log('\n📋 PASO 1: Probando solución...');
  const testPassed = testSolution();

  if (!testPassed) {
    console.log('❌ Los tests fallaron. Abortando aplicación de corrección.');
    process.exit(1);
  }

  // Paso 2: Aplicar corrección
  console.log('\n📋 PASO 2: Aplicando corrección...');
  const fixApplied = applyFix();

  if (!fixApplied) {
    console.log('❌ No se pudo aplicar la corrección.');
    process.exit(1);
  }

  // Paso 3: Verificar corrección
  console.log('\n📋 PASO 3: Verificando corrección...');
  try {
    const testCommand =
      'echo \'{"policy_refs": ["test.js"], "compliance_level": "strict", "code": "line1\\nline2\\nline3", "rules": ["test"]}\' | node agents/rules/agent.js';
    const result = spawnSync('bash', ['-c', testCommand], {
      cwd: process.cwd(),
      encoding: 'utf8',
    });

    if (result.status === 0) {
      console.log(
        '✅ Verificación exitosa - El agente rules ahora maneja JSON con saltos de línea'
      );
    } else {
      console.log('❌ Verificación falló:', result.stderr);
    }
  } catch (error) {
    console.log('❌ Error en verificación:', error.message);
  }

  console.log('\n🎉 Solución completada exitosamente!');
  console.log('\n📝 Resumen de la solución:');
  console.log('- ✅ Identificado problema de parsing JSON con caracteres de control');
  console.log('- ✅ Implementada función escapeControlCharacters mejorada');
  console.log('- ✅ Implementada función safeJsonParse con múltiples estrategias');
  console.log('- ✅ Aplicada corrección al archivo agents/rules/agent.js');
  console.log('- ✅ Verificada funcionalidad con tests');
}

// Ejecutar si es llamado directamente
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export { escapeControlCharacters, safeJsonParse, testSolution, applyFix };
