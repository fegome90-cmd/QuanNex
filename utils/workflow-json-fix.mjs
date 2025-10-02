#!/usr/bin/env node
/**
 * Workflow JSON Fix - Solución específica para el problema del workflow Quannex
 * Corrige el problema de JSON malformado entre agentes
 */

/**
 * Corrige el JSON específico del workflow que causa fallos en el Rules Agent
 * @param {string} problematicJson - JSON que contiene el system_prompt con saltos de línea
 * @returns {string} - JSON corregido y válido
 */
export function fixWorkflowJson(problematicJson) {
  // Caso específico: system_prompt con saltos de línea
  if (problematicJson.includes('system_prompt') && problematicJson.includes('\n')) {
    // Reemplazar saltos de línea literales con \n escapados
    const fixed = problematicJson.replace(/\n/g, '\\n').replace(/\r/g, '\\r').replace(/\t/g, '\\t');

    return fixed;
  }

  return problematicJson;
}

/**
 * Crea input JSON válido para el Rules Agent
 * @param {string} systemPrompt - System prompt del Prompting Agent
 * @param {Array} policyRefs - Referencias de políticas
 * @param {string} complianceLevel - Nivel de compliance
 * @param {Array} rules - Reglas a validar
 * @returns {string} - JSON válido para el Rules Agent
 */
export function createRulesAgentInput(systemPrompt, policyRefs, complianceLevel, rules) {
  // Escapar el system_prompt para que sea JSON válido
  const escapedSystemPrompt = systemPrompt
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\r')
    .replace(/\t/g, '\\t')
    .replace(/"/g, '\\"');

  const input = {
    policy_refs: policyRefs,
    compliance_level: complianceLevel,
    code: escapedSystemPrompt,
    rules: rules,
  };

  return JSON.stringify(input, null, 2);
}

/**
 * Test específico para el caso del workflow
 */
export function testWorkflowFix() {
  console.log('🧪 Probando Workflow JSON Fix...');

  // Caso problemático del workflow
  const problematicInput = `{
  "policy_refs": [
    "docs/quannex-performance-knobs.md",
    "scripts/demo-quannex-lab.sh"
  ],
  "compliance_level": "strict",
  "code": "# Crear comandos para construir el laboratorio Quannex completo

## Context
{\"extracted\":[{\"file\":\"package.json\",\"content\":\"Content from package.json\",\"relevance\":0.8}],\"metadata\":{\"total_sources\":4,\"selectors_applied\":[\"dependencies\",\"docker\",\"scripts\",\"makefile\"],\"max_tokens\":1500}}

## Constraints
Incluir comandos de construcción Docker
- Verificar que todos los archivos necesarios existen
- Crear script de validación de dependencias
- Documentar pasos de construcción

## Style
technical

Generated at: 2025-10-02T19:00:36.599Z",
  "rules": [
    "Validar que el benchmark se ejecute correctamente",
    "Verificar métricas de rendimiento",
    "Asegurar que Gate 14 anti-simulación funcione",
    "Documentar resultados del benchmark"
  ]
}`;

  console.log('\n❌ JSON Problemático:');
  console.log('Contiene saltos de línea literales que causan fallo en JSON.parse()');

  try {
    JSON.parse(problematicInput);
    console.log('✅ JSON válido (no debería pasar)');
  } catch (error) {
    console.log(`❌ Error esperado: ${error.message}`);
  }

  console.log('\n🔧 Aplicando fix...');
  const fixed = fixWorkflowJson(problematicInput);

  try {
    const parsed = JSON.parse(fixed);
    console.log('✅ JSON corregido y válido');
    console.log(`📋 Keys: ${Object.keys(parsed).join(', ')}`);
    console.log(`📝 Code field length: ${parsed.code.length} chars`);
  } catch (error) {
    console.log(`❌ Error después del fix: ${error.message}`);
  }

  console.log('\n🚀 Probando con Rules Agent...');
  const rulesInput = createRulesAgentInput(
    parsed.code,
    parsed.policy_refs,
    parsed.compliance_level,
    parsed.rules
  );

  try {
    const rulesParsed = JSON.parse(rulesInput);
    console.log('✅ Input para Rules Agent válido');
    console.log(`📋 Rules count: ${rulesParsed.rules.length}`);
  } catch (error) {
    console.log(`❌ Error en Rules Agent input: ${error.message}`);
  }
}

// Ejecutar test si es llamado directamente
if (import.meta.url === `file://${process.argv[1]}`) {
  testWorkflowFix();
}
