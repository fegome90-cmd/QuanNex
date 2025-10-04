#!/usr/bin/env node
/**
 * Set Canary Traffic - Configurar tráfico canary para deployment gradual
 * Controla el porcentaje de tráfico dirigido a la nueva versión
 */
import fs from 'fs';
import path from 'path';

const CONFIG = {
  traffic_config_file: 'ops/traffic/canary_config.json',
  log_file: 'logs/traffic_control.log',
};

class CanaryTrafficController {
  constructor() {
    this.ensureLogDir();
  }

  ensureLogDir() {
    const logDir = path.dirname(CONFIG.log_file);
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }
  }

  log(message) {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] ${message}\n`;

    console.log(message);

    // Append to log file
    fs.appendFileSync(CONFIG.log_file, logMessage);
  }

  loadTrafficConfig() {
    if (fs.existsSync(CONFIG.traffic_config_file)) {
      try {
        const config = JSON.parse(fs.readFileSync(CONFIG.traffic_config_file, 'utf-8'));
        return config;
      } catch (error) {
        this.log(`⚠️  Error loading traffic config: ${error.message}`);
        return this.getDefaultConfig();
      }
    }

    return this.getDefaultConfig();
  }

  getDefaultConfig() {
    return {
      current_percentage: 0,
      canary_enabled: false,
      last_updated: new Date().toISOString(),
      version: 'unknown',
      history: [],
    };
  }

  saveTrafficConfig(config) {
    // Crear directorio si no existe
    const configDir = path.dirname(CONFIG.traffic_config_file);
    if (!fs.existsSync(configDir)) {
      fs.mkdirSync(configDir, { recursive: true });
    }

    fs.writeFileSync(CONFIG.traffic_config_file, JSON.stringify(config, null, 2));
    this.log(`💾 Traffic config saved: ${config.current_percentage}%`);
  }

  setCanaryTraffic(percentage) {
    const config = this.loadTrafficConfig();

    // Validar porcentaje
    if (percentage < 0 || percentage > 100) {
      throw new Error(`Invalid percentage: ${percentage}. Must be between 0 and 100.`);
    }

    // Actualizar configuración
    const oldPercentage = config.current_percentage;
    config.current_percentage = percentage;
    config.canary_enabled = percentage > 0;
    config.last_updated = new Date().toISOString();

    // Agregar al historial
    config.history.push({
      percentage: percentage,
      timestamp: new Date().toISOString(),
      action: 'manual',
    });

    // Mantener solo últimos 50 cambios
    if (config.history.length > 50) {
      config.history = config.history.slice(-50);
    }

    // Guardar configuración
    this.saveTrafficConfig(config);

    // Aplicar cambios según el tipo de control de tráfico
    this.applyTrafficControl(percentage);

    this.log(`🚦 Traffic changed: ${oldPercentage}% → ${percentage}%`);

    return {
      success: true,
      old_percentage: oldPercentage,
      new_percentage: percentage,
      canary_enabled: config.canary_enabled,
      timestamp: config.last_updated,
    };
  }

  applyTrafficControl(percentage) {
    // Implementación específica según el tipo de control de tráfico

    // Opción 1: Feature Flags (ejemplo con archivo de configuración)
    this.updateFeatureFlags(percentage);

    // Opción 2: Load Balancer (ejemplo con nginx)
    this.updateLoadBalancer(percentage);

    // Opción 3: Application-level routing
    this.updateApplicationRouting(percentage);
  }

  updateFeatureFlags(percentage) {
    // Actualizar feature flags para control de tráfico
    const featureFlagsFile = 'ops/traffic/feature_flags.json';

    const featureFlags = {
      'rag-canary-enabled': percentage > 0,
      'rag-canary-percentage': percentage,
      'rag-rollback-enabled': percentage === 0,
      last_updated: new Date().toISOString(),
    };

    // Crear directorio si no existe
    const flagsDir = path.dirname(featureFlagsFile);
    if (!fs.existsSync(flagsDir)) {
      fs.mkdirSync(flagsDir, { recursive: true });
    }

    fs.writeFileSync(featureFlagsFile, JSON.stringify(featureFlags, null, 2));
    this.log(`🏁 Feature flags updated for ${percentage}% traffic`);
  }

  updateLoadBalancer(percentage) {
    // Ejemplo de actualización de nginx para canary
    const nginxConfigFile = 'ops/traffic/nginx_canary.conf';

    const nginxConfig = `# Nginx Canary Configuration - Generated ${new Date().toISOString()}
upstream rag_backend {
    # Stable version
    server rag-stable:8000 weight=${100 - percentage};
    
    # Canary version  
    server rag-canary:8000 weight=${percentage};
}

server {
    listen 80;
    server_name rag-api.example.com;
    
    location / {
        proxy_pass http://rag_backend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
`;

    // Crear directorio si no existe
    const nginxDir = path.dirname(nginxConfigFile);
    if (!fs.existsSync(nginxDir)) {
      fs.mkdirSync(nginxDir, { recursive: true });
    }

    fs.writeFileSync(nginxConfigFile, nginxConfig);
    this.log(`⚖️  Load balancer config updated for ${percentage}% canary`);
  }

  updateApplicationRouting(percentage) {
    // Actualizar configuración de routing a nivel de aplicación
    const routingConfigFile = 'ops/traffic/routing_config.json';

    const routingConfig = {
      stable: {
        percentage: 100 - percentage,
        endpoint: 'http://rag-stable:8000',
        enabled: true,
      },
      canary: {
        percentage: percentage,
        endpoint: 'http://rag-canary:8000',
        enabled: percentage > 0,
      },
      fallback: {
        enabled: percentage === 0,
        endpoint: 'http://rag-stable:8000',
      },
      last_updated: new Date().toISOString(),
    };

    // Crear directorio si no existe
    const routingDir = path.dirname(routingConfigFile);
    if (!fs.existsSync(routingDir)) {
      fs.mkdirSync(routingDir, { recursive: true });
    }

    fs.writeFileSync(routingConfigFile, JSON.stringify(routingConfig, null, 2));
    this.log(`🛣️  Application routing updated for ${percentage}% canary`);
  }

  getCurrentTraffic() {
    const config = this.loadTrafficConfig();
    return {
      percentage: config.current_percentage,
      canary_enabled: config.canary_enabled,
      last_updated: config.last_updated,
      version: config.version,
    };
  }

  getTrafficHistory() {
    const config = this.loadTrafficConfig();
    return config.history.slice(-10); // Últimos 10 cambios
  }

  emergencyStop() {
    this.log('🚨 EMERGENCY STOP - Setting traffic to 0%');
    return this.setCanaryTraffic(0);
  }
}

// CLI interface
function main() {
  const args = process.argv.slice(2);
  const controller = new CanaryTrafficController();

  if (args.length === 0) {
    // Mostrar estado actual
    const current = controller.getCurrentTraffic();
    console.log('🚦 Current Traffic Status:');
    console.log(`  Percentage: ${current.percentage}%`);
    console.log(`  Canary Enabled: ${current.canary_enabled}`);
    console.log(`  Last Updated: ${current.last_updated}`);
    console.log(`  Version: ${current.version}`);

    const history = controller.getTrafficHistory();
    if (history.length > 0) {
      console.log('\n📊 Recent Changes:');
      history.forEach(change => {
        console.log(`  ${change.timestamp}: ${change.percentage}% (${change.action})`);
      });
    }

    return;
  }

  const command = args[0];

  switch (command) {
    case '--percent':
    case '-p':
      const percentage = parseInt(args[1]);
      if (isNaN(percentage)) {
        console.error('❌ Invalid percentage. Must be a number between 0 and 100.');
        process.exit(1);
      }

      try {
        const result = controller.setCanaryTraffic(percentage);
        console.log('✅ Traffic configuration updated:');
        console.log(`  Old: ${result.old_percentage}%`);
        console.log(`  New: ${result.new_percentage}%`);
        console.log(`  Canary: ${result.canary_enabled ? 'Enabled' : 'Disabled'}`);
      } catch (error) {
        console.error(`❌ Failed to set traffic: ${error.message}`);
        process.exit(1);
      }
      break;

    case '--emergency-stop':
    case '--stop':
      try {
        const result = controller.emergencyStop();
        console.log('🚨 Emergency stop executed:');
        console.log(`  Traffic set to: ${result.new_percentage}%`);
        console.log(`  Canary: ${result.canary_enabled ? 'Enabled' : 'Disabled'}`);
      } catch (error) {
        console.error(`❌ Emergency stop failed: ${error.message}`);
        process.exit(1);
      }
      break;

    case '--help':
    case '-h':
      console.log('Usage: node set_canary.mjs [options]');
      console.log('');
      console.log('Options:');
      console.log('  --percent <0-100>    Set canary traffic percentage');
      console.log('  --emergency-stop     Emergency stop (0% traffic)');
      console.log('  --help               Show this help');
      console.log('');
      console.log('Examples:');
      console.log('  node set_canary.mjs --percent 10');
      console.log('  node set_canary.mjs --percent 0');
      console.log('  node set_canary.mjs --emergency-stop');
      break;

    default:
      console.error(`❌ Unknown command: ${command}`);
      console.error('Use --help for usage information');
      process.exit(1);
  }
}

// Ejecutar si es llamado directamente
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export default CanaryTrafficController;
