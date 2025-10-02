#!/usr/bin/env node
/**
 * JSON Escape Fix - Solución Quannex para problemas de parsing JSON
 * Basado en análisis de workflow fallido
 */

/**
 * Escapa caracteres de control en strings JSON para evitar errores de parsing
 * @param {string} jsonString - String JSON que puede contener caracteres problemáticos
 * @returns {string} - JSON string con caracteres escapados
 */
export function escapeJsonControlChars(jsonString) {
  if (typeof jsonString !== 'string') {
    throw new Error('Input must be a string');
  }

  // CORRECCIÓN: Solo escapar caracteres de control dentro de strings JSON
  // No tocar la estructura del JSON, solo el contenido de los strings
  try {
    // Primero intentar parsear para validar estructura
    const _parsed = JSON.parse(jsonString);

    // Si es válido, retornar tal como está
    return jsonString;
  } catch (_error) {
    // Si falla, intentar reparar solo los strings problemáticos
    return jsonString
      .replace(/\n/g, '\\n') // Saltos de línea
      .replace(/\r/g, '\\r') // Retornos de carro
      .replace(/\t/g, '\\t') // Tabulaciones
      .replace(/\b/g, '\\b') // Backspace
      .replace(/\f/g, '\\f') // Form feed
      .replace(/\\/g, '\\\\') // Backslashes
      .replace(/"/g, '\\"'); // Comillas dobles
  }
}

/**
 * Valida que un string sea JSON válido después del escape
 * @param {string} jsonString - String JSON a validar
 * @returns {boolean} - True si es JSON válido
 */
export function validateJson(jsonString) {
  try {
    JSON.parse(jsonString);
    return true;
  } catch (_error) {
    return false;
  }
}

/**
 * Procesa output de agente para asegurar compatibilidad JSON
 * @param {string} agentOutput - Output del agente que puede contener caracteres problemáticos
 * @returns {string} - JSON válido escapado
 */
export function sanitizeAgentOutput(agentOutput) {
  // Si ya es JSON válido, no hacer nada
  if (validateJson(agentOutput)) {
    return agentOutput;
  }

  // Intentar escapar caracteres de control
  const escaped = escapeJsonControlChars(agentOutput);

  if (validateJson(escaped)) {
    return escaped;
  }

  // Si aún no es válido, envolver en JSON
  return JSON.stringify(agentOutput);
}

/**
 * Función de prueba para validar la solución
 */
export function testJsonEscape() {
  const testCases = [
    '{"message": "Hello\nWorld"}',
    '{"code": "# Title\n\n## Content\n\nGenerated at: 2025-10-02T19:00:36.599Z"}',
    '{"system_prompt": "# Crear comandos\n\n## Context\n{\"extracted\":[...]}"}',
  ];

  console.log('🧪 Probando JSON Escape Fix...');

  testCases.forEach((testCase, index) => {
    console.log(`\nTest ${index + 1}:`);
    console.log(`Input: ${testCase.substring(0, 50)}...`);

    try {
      const escaped = escapeJsonControlChars(testCase);
      const isValid = validateJson(escaped);
      console.log(`✅ Válido: ${isValid}`);

      if (isValid) {
        const parsed = JSON.parse(escaped);
        console.log(`📋 Parsed keys: ${Object.keys(parsed).join(', ')}`);
      }
    } catch (error) {
      console.log(`❌ Error: ${error.message}`);
    }
  });
}

// Ejecutar tests si es llamado directamente
if (import.meta.url === `file://${process.argv[1]}`) {
  testJsonEscape();
}
