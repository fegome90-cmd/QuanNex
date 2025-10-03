#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Configuración del sistema de telemetría QuanNex
 */
const TELEMETRY_CONFIG = {
  // Directorios
  reports_dir: '.reports',
  metrics_dir: '.reports/metrics',
  logs_dir: '.reports/logs',

  // Archivos
  events_file: '.reports/metrics/qnx-events.jsonl',
  config_file: '.reports/qnx-telemetry-config.json',

  // Configuración por defecto
  default_settings: {
    enabled: true,
    log_level: 'info',
    retention_days: 30,
    max_file_size_mb: 100,
    compression_enabled: false,
    real_time_monitoring: true,
    auto_cleanup: true,
    alerts_enabled: true,
    health_checks_enabled: true,
  },

  // Umbrales por defecto
  default_thresholds: {
    orchestrator_share_min: 95,
    bypass_rate_max: 5,
    tool_misfire_rate_max: 3,
    success_rate_min: 90,
    avg_latency_max: 5000,
    p95_latency_max: 10000,
    max_components_per_run: 10,
    max_run_duration_ms: 30000,
  },

  // Intenciones requeridas por defecto
  default_required_intents: [
    'auditoría',
    'audit',
    'security',
    'seguridad',
    'plan',
    'planning',
    'planificar',
    'fix-lint',
    'lint',
    'refactor',
    'refactoring',
    'refactorizar',
    'test',
    'testing',
    'tests',
    'pruebas',
    'workflow',
    'orchestration',
    'orquestación',
    'agent',
    'agente',
    'mcp',
    'quannex',
    'orchestrator',
    'orquestador',
  ],
};

/**
 * Crea la estructura de directorios necesaria
 */
function createDirectories() {
  console.log('📁 Creando directorios de telemetría...');

  const directories = [
    TELEMETRY_CONFIG.reports_dir,
    TELEMETRY_CONFIG.metrics_dir,
    TELEMETRY_CONFIG.logs_dir,
  ];

  directories.forEach(dir => {
    const fullPath = path.join(__dirname, '..', dir);
    if (!fs.existsSync(fullPath)) {
      fs.mkdirSync(fullPath, { recursive: true });
      console.log(`   ✅ Creado: ${dir}`);
    } else {
      console.log(`   ℹ️ Ya existe: ${dir}`);
    }
  });
}

/**
 * Crea archivo de configuración
 */
function createConfigFile() {
  console.log('⚙️ Creando archivo de configuración...');

  const configPath = path.join(__dirname, '..', TELEMETRY_CONFIG.config_file);

  const config = {
    version: '1.0.0',
    created_at: new Date().toISOString(),
    settings: TELEMETRY_CONFIG.default_settings,
    thresholds: TELEMETRY_CONFIG.default_thresholds,
    required_intents: TELEMETRY_CONFIG.default_required_intents,
    components: {
      orchestrator: { enabled: true, priority: 1 },
      router: { enabled: true, priority: 2 },
      planner: { enabled: true, priority: 3 },
      validator: { enabled: true, priority: 4 },
      rag: { enabled: true, priority: 5 },
      codegen: { enabled: true, priority: 6 },
    },
    sources: {
      cursor: { enabled: true, gate_enabled: true },
      cli: { enabled: true, gate_enabled: false },
      api: { enabled: true, gate_enabled: false },
    },
  };

  try {
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
    console.log(`   ✅ Configuración creada: ${TELEMETRY_CONFIG.config_file}`);
    return configPath;
  } catch (error) {
    console.error(`   ❌ Error creando configuración: ${error.message}`);
    return null;
  }
}

/**
 * Crea archivo de eventos inicial (vacío)
 */
function createEventsFile() {
  console.log('📊 Inicializando archivo de eventos...');

  const eventsPath = path.join(__dirname, '..', TELEMETRY_CONFIG.events_file);

  try {
    if (!fs.existsSync(eventsPath)) {
      fs.writeFileSync(eventsPath, '');
      console.log(`   ✅ Archivo de eventos creado: ${TELEMETRY_CONFIG.events_file}`);
    } else {
      console.log(`   ℹ️ Archivo de eventos ya existe: ${TELEMETRY_CONFIG.events_file}`);
    }
    return eventsPath;
  } catch (error) {
    console.error(`   ❌ Error creando archivo de eventos: ${error.message}`);
    return null;
  }
}

/**
 * Crea archivo .gitignore para telemetría
 */
function createGitignore() {
  console.log('🔒 Configurando .gitignore para telemetría...');

  const gitignorePath = path.join(__dirname, '..', '.gitignore');
  const telemetryIgnores = [
    '',
    '# QuanNex Telemetry',
    '.reports/metrics/',
    '.reports/logs/',
    '!reports/qnx-telemetry-config.json',
    '*.jsonl',
    'qnx-alerts-*.json',
  ];

  try {
    let gitignoreContent = '';
    if (fs.existsSync(gitignorePath)) {
      gitignoreContent = fs.readFileSync(gitignorePath, 'utf8');
    }

    // Verificar si ya tiene las reglas de telemetría
    if (!gitignoreContent.includes('# QuanNex Telemetry')) {
      gitignoreContent += '\n' + telemetryIgnores.join('\n') + '\n';
      fs.writeFileSync(gitignorePath, gitignoreContent);
      console.log('   ✅ Reglas de .gitignore actualizadas');
    } else {
      console.log('   ℹ️ Reglas de .gitignore ya configuradas');
    }
  } catch (error) {
    console.error(`   ❌ Error configurando .gitignore: ${error.message}`);
  }
}

/**
 * Crea script de ejemplo para probar telemetría
 */
function createTestScript() {
  console.log('🧪 Creando script de prueba...');

  const testScriptPath = path.join(__dirname, '..', 'scripts', 'qnx-telemetry-test.mjs');

  const testScript = `#!/usr/bin/env node

// Script de prueba para telemetría QuanNex
import { 
  qnxRunStart, 
  qnxRunEnd, 
  qnxUse, 
  qnxInstrument,
  COMPONENTS, 
  SOURCES, 
  ACTIONS 
} from '../packages/quannex-mcp/telemetry.mjs';

async function runTest() {
  console.log('🧪 Ejecutando prueba de telemetría...');
  
  // Simular un workflow completo
  const runId = qnxRunStart(SOURCES.CLI, 'telemetry_test');
  
  try {
    // Simular orchestrator
    await qnxInstrument(runId, COMPONENTS.ORCHESTRATOR, async () => {
      console.log('   📊 Orchestrator ejecutándose...');
      await new Promise(resolve => setTimeout(resolve, 100));
    }, { workflow_name: 'test_workflow' });
    
    // Simular router
    await qnxInstrument(runId, COMPONENTS.ROUTER, async () => {
      console.log('   🛣️ Router ejecutándose...');
      await new Promise(resolve => setTimeout(resolve, 50));
    }, { route: 'test_route' });
    
    // Simular planner
    await qnxInstrument(runId, COMPONENTS.PLANNER, async () => {
      console.log('   📋 Planner ejecutándose...');
      await new Promise(resolve => setTimeout(resolve, 75));
    }, { plan_type: 'test_plan' });
    
    // Finalizar exitosamente
    qnxRunEnd(runId, true, { 
      test_completed: true,
      components_tested: 3 
    });
    
    console.log('✅ Prueba completada exitosamente');
    
  } catch (error) {
    qnxRunEnd(runId, false, { 
      error: error.message,
      test_failed: true 
    });
    console.error('❌ Prueba falló:', error.message);
  }
}

// Ejecutar prueba
runTest().catch(console.error);
`;

  try {
    fs.writeFileSync(testScriptPath, testScript);
    fs.chmodSync(testScriptPath, '755');
    console.log(`   ✅ Script de prueba creado: scripts/qnx-telemetry-test.mjs`);
  } catch (error) {
    console.error(`   ❌ Error creando script de prueba: ${error.message}`);
  }
}

/**
 * Verifica dependencias
 */
function checkDependencies() {
  console.log('🔍 Verificando dependencias...');

  const packageJsonPath = path.join(__dirname, '..', 'package.json');

  if (!fs.existsSync(packageJsonPath)) {
    console.log('   ⚠️ package.json no encontrado');
    return false;
  }

  try {
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    const requiredDeps = ['jq'];

    // Verificar si jq está disponible en el sistema
    const { execSync } = require('child_process');

    try {
      execSync('which jq', { stdio: 'ignore' });
      console.log('   ✅ jq disponible');
    } catch {
      console.log('   ⚠️ jq no encontrado - instalar para análisis avanzado');
    }

    console.log('   ✅ Dependencias verificadas');
    return true;
  } catch (error) {
    console.error(`   ❌ Error verificando dependencias: ${error.message}`);
    return false;
  }
}

/**
 * Muestra instrucciones de uso
 */
function showUsageInstructions() {
  console.log('\n🎯 SISTEMA DE TELEMETRÍA QUANNEX CONFIGURADO');
  console.log('============================================\n');

  console.log('📋 Comandos disponibles:');
  console.log('   make -f Makefile.qnx-telemetry help          # Ver todos los comandos');
  console.log('   make -f Makefile.qnx-telemetry telemetry-stats    # Estadísticas rápidas');
  console.log('   make -f Makefile.qnx-telemetry telemetry-report   # Reporte completo');
  console.log('   make -f Makefile.qnx-telemetry telemetry-health   # Verificar salud');
  console.log('   make -f Makefile.qnx-telemetry telemetry-test     # Probar sistema');
  console.log('');

  console.log('📊 Archivos generados:');
  console.log(`   ${TELEMETRY_CONFIG.events_file}    # Eventos de telemetría`);
  console.log(`   ${TELEMETRY_CONFIG.config_file}    # Configuración`);
  console.log('   .reports/qnx-telemetry-report.html # Reporte HTML');
  console.log('');

  console.log('🔧 Próximos pasos:');
  console.log('   1. Ejecutar: node scripts/qnx-telemetry-test.mjs');
  console.log('   2. Verificar: make -f Makefile.qnx-telemetry telemetry-stats');
  console.log('   3. Configurar alertas según necesidades');
  console.log('   4. Integrar con sistemas de monitoreo existentes');
  console.log('');

  console.log('📚 Documentación:');
  console.log('   - Ver packages/quannex-mcp/telemetry.mjs para API');
  console.log('   - Ver packages/quannex-mcp/gates.mjs para gates');
  console.log('   - Ver scripts/qnx-telemetry-alerts.mjs para alertas');
  console.log('');
}

/**
 * Función principal de configuración
 */
async function main() {
  console.log('🚀 Configurando sistema de telemetría QuanNex...\n');

  try {
    // Crear directorios
    createDirectories();
    console.log('');

    // Crear archivos de configuración
    createConfigFile();
    createEventsFile();
    console.log('');

    // Configurar gitignore
    createGitignore();
    console.log('');

    // Crear script de prueba
    createTestScript();
    console.log('');

    // Verificar dependencias
    checkDependencies();
    console.log('');

    // Mostrar instrucciones
    showUsageInstructions();

    console.log('✅ Configuración completada exitosamente');
  } catch (error) {
    console.error('❌ Error durante la configuración:', error.message);
    process.exit(1);
  }
}

// Ejecutar configuración
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}
