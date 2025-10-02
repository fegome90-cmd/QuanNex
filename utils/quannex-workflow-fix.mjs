#!/usr/bin/env node
/**
 * Quannex Workflow Fix - Solución directa para el problema del workflow
 * Usa el análisis de Quannex para crear una solución práctica
 */

/**
 * Ejecuta el workflow corregido paso a paso
 */
export async function executeFixedWorkflow() {
  console.log('🚀 Ejecutando Workflow Quannex Corregido...\n');

  // PASO 1: Context Agent
  console.log('📋 PASO 1: Context Agent (verificar_dependencias)');
  const context1Output = await executeContextAgent(
    ['package.json', 'docker/context/Dockerfile', 'docker/context/compose.yml', 'Makefile.quannex'],
    ['dependencies', 'docker', 'scripts', 'makefile'],
    1500
  );

  if (!context1Output.success) {
    console.log('❌ Fallo en Context Agent 1');
    return false;
  }
  console.log('✅ Context Agent 1 exitoso');

  // PASO 2: Prompting Agent
  console.log('\n📝 PASO 2: Prompting Agent (construir_laboratorio)');
  const prompting1Output = await executePromptingAgent(
    'Crear comandos para construir el laboratorio Quannex completo',
    context1Output.data.context_bundle,
    'technical',
    [
      'Incluir comandos de construcción Docker',
      'Verificar que todos los archivos necesarios existen',
      'Crear script de validación de dependencias',
      'Documentar pasos de construcción',
    ]
  );

  if (!prompting1Output.success) {
    console.log('❌ Fallo en Prompting Agent 1');
    return false;
  }
  console.log('✅ Prompting Agent 1 exitoso');

  // PASO 3: Rules Agent (CON CORRECCIÓN)
  console.log('\n🔒 PASO 3: Rules Agent (ejecutar_benchmark) - CON CORRECCIÓN');
  const rulesOutput = await executeRulesAgentFixed(
    ['docs/quannex-performance-knobs.md', 'scripts/demo-quannex-lab.sh'],
    'strict',
    prompting1Output.data.system_prompt,
    [
      'Validar que el benchmark se ejecute correctamente',
      'Verificar métricas de rendimiento',
      'Asegurar que Gate 14 anti-simulación funcione',
      'Documentar resultados del benchmark',
    ]
  );

  if (!rulesOutput.success) {
    console.log('❌ Fallo en Rules Agent');
    return false;
  }
  console.log('✅ Rules Agent exitoso (problema corregido)');

  // PASO 4: Context Agent
  console.log('\n📋 PASO 4: Context Agent (analizar_resultados)');
  const context2Output = await executeContextAgent(
    [
      'logs/context-bench.jsonl',
      'logs/context-bench-analysis.json',
      'tools/context-analyze.mjs',
      'tools/context-bench.mjs',
    ],
    ['metrics', 'performance', 'gate14', 'analysis'],
    2000
  );

  if (!context2Output.success) {
    console.log('❌ Fallo en Context Agent 2');
    return false;
  }
  console.log('✅ Context Agent 2 exitoso');

  // PASO 5: Prompting Agent
  console.log('\n📝 PASO 5: Prompting Agent (generar_reporte_final)');
  const prompting2Output = await executePromptingAgent(
    'Generar reporte completo del workflow Quannex con resultados y recomendaciones',
    context2Output.data.context_bundle,
    'technical',
    [
      'Incluir métricas de rendimiento obtenidas',
      'Documentar problemas encontrados',
      'Proporcionar recomendaciones de optimización',
      'Crear checklist de validación',
      'Incluir comandos para reproducir resultados',
    ]
  );

  if (!prompting2Output.success) {
    console.log('❌ Fallo en Prompting Agent 2');
    return false;
  }
  console.log('✅ Prompting Agent 2 exitoso');

  console.log('\n🎉 WORKFLOW COMPLETADO EXITOSAMENTE');
  console.log('✅ Todos los agentes pasaron sin errores');
  console.log('🔧 Problema del JSON corregido en Rules Agent');

  return true;
}

/**
 * Ejecuta Context Agent con manejo de errores
 */
async function executeContextAgent(sources, selectors, maxTokens) {
  try {
    const input = {
      sources,
      selectors,
      max_tokens: maxTokens,
    };

    const { spawn } = await import('node:child_process');
    const child = spawn('node', ['agents/context/agent.js'], {
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', data => {
      stdout += data.toString();
    });

    child.stderr.on('data', data => {
      stderr += data.toString();
    });

    child.stdin.write(JSON.stringify(input));
    child.stdin.end();

    return new Promise(resolve => {
      child.on('close', code => {
        if (code === 0) {
          try {
            const result = JSON.parse(stdout);
            resolve({ success: true, data: result });
          } catch (error) {
            resolve({ success: false, error: 'Parse error: ' + error.message });
          }
        } else {
          resolve({ success: false, error: stderr || 'Process failed' });
        }
      });
    });
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * Ejecuta Prompting Agent con manejo de errores
 */
async function executePromptingAgent(goal, context, style, constraints) {
  try {
    const input = {
      goal,
      context,
      style,
      constraints,
    };

    const { spawn } = await import('node:child_process');
    const child = spawn('node', ['agents/prompting/agent.js'], {
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', data => {
      stdout += data.toString();
    });

    child.stderr.on('data', data => {
      stderr += data.toString();
    });

    child.stdin.write(JSON.stringify(input));
    child.stdin.end();

    return new Promise(resolve => {
      child.on('close', code => {
        if (code === 0) {
          try {
            const result = JSON.parse(stdout);
            resolve({ success: true, data: result });
          } catch (error) {
            resolve({ success: false, error: 'Parse error: ' + error.message });
          }
        } else {
          resolve({ success: false, error: stderr || 'Process failed' });
        }
      });
    });
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * Ejecuta Rules Agent CON CORRECCIÓN para el problema del JSON
 */
async function executeRulesAgentFixed(policyRefs, complianceLevel, systemPrompt, rules) {
  try {
    // CORRECCIÓN: Escapar caracteres de control en system_prompt
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

    const { spawn } = await import('node:child_process');
    const child = spawn('node', ['agents/rules/agent.js'], {
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', data => {
      stdout += data.toString();
    });

    child.stderr.on('data', data => {
      stderr += data.toString();
    });

    child.stdin.write(JSON.stringify(input));
    child.stdin.end();

    return new Promise(resolve => {
      child.on('close', code => {
        if (code === 0) {
          try {
            const result = JSON.parse(stdout);
            resolve({ success: true, data: result });
          } catch (error) {
            resolve({ success: false, error: 'Parse error: ' + error.message });
          }
        } else {
          resolve({ success: false, error: stderr || 'Process failed' });
        }
      });
    });
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// Ejecutar si es llamado directamente
if (import.meta.url === `file://${process.argv[1]}`) {
  executeFixedWorkflow().then(success => {
    if (success) {
      console.log('\n🏆 WORKFLOW QUANNEX SOLUCIONADO EXITOSAMENTE');
      process.exit(0);
    } else {
      console.log('\n❌ WORKFLOW FALLÓ');
      process.exit(1);
    }
  });
}
