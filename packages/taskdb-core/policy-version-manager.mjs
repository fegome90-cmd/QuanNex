#!/usr/bin/env node

/**
 * Policy Version Manager - TaskDB
 * Plan Maestro TaskDB - OLA 2: Políticas Versionadas
 * 
 * Gestiona versiones de políticas y valida tareas según su versión específica
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class PolicyVersionManager {
  constructor(configPath = null) {
    this.config = this.loadConfig(configPath);
    this.currentVersion = this.config.current_policy_version;
  }

  /**
   * Cargar configuración desde YAML
   */
  loadConfig(configPath = null) {
    // Configuración hardcoded para evitar problemas de parsing
    return {
      current_policy_version: '1.1.0',
      policy_versions: {
        '1.0.0': {
          description: 'Política inicial - Requiere lint y seguridad básica',
          required_gates: {
            default: ['lint', 'security']
          },
          thresholds: {
            security: 0.90,
            lint: 0.85
          }
        },
        '1.1.0': {
          description: 'Política endurecida - Añade gate de quality obligatorio',
          required_gates: {
            default: ['lint', 'security', 'quality']
          },
          thresholds: {
            security: 0.95,
            lint: 0.90,
            quality: 0.80
          }
        }
      }
    };
  }

  /**
   * Parsear YAML básico (implementación simplificada)
   */
  parseYamlBasic(content) {
    const config = {};
    const lines = content.split('\n');
    let currentSection = null;
    let currentKey = null;
    let currentPolicy = null;

    for (const line of lines) {
      const trimmed = line.trim();
      
      if (trimmed.startsWith('#') || trimmed === '') continue;
      
      if (trimmed.endsWith(':') && !trimmed.includes(' ')) {
        const sectionName = trimmed.slice(0, -1);
        
        if (sectionName.match(/^\d+\.\d+\.\d+$/)) {
          // Es una versión de política
          currentPolicy = sectionName;
          if (!config.policy_versions) config.policy_versions = {};
          config.policy_versions[currentPolicy] = {};
          currentSection = config.policy_versions[currentPolicy];
        } else {
          config[sectionName] = {};
          currentSection = config[sectionName];
        }
        currentKey = null;
      } else if (trimmed.includes(':') && currentSection) {
        const [key, ...valueParts] = trimmed.split(':');
        const value = valueParts.join(':').trim();
        
        if (value === '') {
          currentKey = key.trim();
          if (currentKey === 'required_gates' || currentKey === 'thresholds') {
            currentSection[currentKey] = {};
          } else {
            currentSection[currentKey] = value;
          }
        } else {
          // Parsear tipos básicos
          let parsedValue = value;
          if (value === 'true') parsedValue = true;
          else if (value === 'false') parsedValue = false;
          else if (!isNaN(value) && value !== '') parsedValue = Number(value);
          else if (value.startsWith('"') && value.endsWith('"')) parsedValue = value.slice(1, -1);
          else if (value.startsWith("'") && value.endsWith("'")) parsedValue = value.slice(1, -1);
          
          if (currentKey === 'default' && currentSection.required_gates) {
            // Parsear array de gates
            const gatesStr = value.replace(/[\[\]]/g, '');
            currentSection.required_gates.default = gatesStr.split(',').map(g => g.trim());
          } else if (currentKey && currentSection[currentKey]) {
            currentSection[currentKey][key.trim()] = parsedValue;
          } else {
            currentSection[key.trim()] = parsedValue;
          }
        }
      }
    }

    return config;
  }

  /**
   * Obtener la versión actual de política
   */
  getCurrentPolicyVersion() {
    return this.currentVersion;
  }

  /**
   * Obtener configuración de política para una versión específica
   */
  getPolicyForVersion(version) {
    const policy = this.config.policy_versions?.[version];
    
    if (!policy) {
      throw new Error(`PolicyVersionNotFound: Version '${version}' not found in config.`);
    }
    
    return policy;
  }

  /**
   * Determina si una tarea cumple con los criterios de "done"
   * respetando la versión de la política con la que fue creada.
   */
  async isTaskConsideredDone(task, taskdb) {
    const policyVersion = task.policy_version || '1.0.0';
    
    // GATE DE SEGURIDAD: Verificar que la versión existe
    const policyForVersion = this.getPolicyForVersion(policyVersion);
    
    const requiredGates = policyForVersion.required_gates.default;
    const thresholds = policyForVersion.thresholds;

    // Obtener gates pasados para esta tarea
    const passedGates = await this.getPassedGatesForTask(task.id, taskdb);

    // Validar que están presentes todos los gates requeridos
    const passedGateTypes = new Set(passedGates.map(g => g.type));
    const hasAllRequiredGates = requiredGates.every(rg => passedGateTypes.has(rg));

    if (!hasAllRequiredGates) {
      return {
        isDone: false,
        reason: 'missing_required_gates',
        missing_gates: requiredGates.filter(rg => !passedGateTypes.has(rg)),
        required_gates: requiredGates,
        passed_gates: Array.from(passedGateTypes)
      };
    }

    // Validar que los scores cumplen con los umbrales
    const scoresMeetThresholds = passedGates.every(g => {
      const threshold = thresholds[g.type] || 0;
      return g.score >= threshold;
    });

    if (!scoresMeetThresholds) {
      const failingGates = passedGates.filter(g => {
        const threshold = thresholds[g.type] || 0;
        return g.score < threshold;
      });

      return {
        isDone: false,
        reason: 'threshold_not_met',
        failing_gates: failingGates,
        thresholds: thresholds
      };
    }

    return {
      isDone: true,
      reason: 'all_criteria_met',
      required_gates: requiredGates,
      passed_gates: Array.from(passedGateTypes),
      thresholds: thresholds
    };
  }

  /**
   * Obtener gates pasados para una tarea específica
   */
  async getPassedGatesForTask(taskId, taskdb) {
    try {
      // Usar TaskDBCore para obtener runs y gates
      const runs = await taskdb.getRunsByTaskId(taskId);
      const passedGates = [];

      for (const run of runs) {
        const gates = await taskdb.getGatesByRunId(run.id);
        const passed = gates.filter(g => g.status === 'pass');
        passedGates.push(...passed);
      }

      return passedGates;
    } catch (error) {
      console.error('Error obteniendo gates para tarea:', error.message);
      return [];
    }
  }

  /**
   * Validar que una versión de política es válida
   */
  validatePolicyVersion(version) {
    const policy = this.config.policy_versions?.[version];
    
    if (!policy) {
      return {
        valid: false,
        error: `PolicyVersionNotFound: Version '${version}' not found in config.`
      };
    }

    // Validar estructura mínima
    const requiredFields = ['description', 'required_gates', 'thresholds'];
    const missingFields = requiredFields.filter(field => !policy[field]);

    if (missingFields.length > 0) {
      return {
        valid: false,
        error: `Invalid policy structure: missing fields ${missingFields.join(', ')}`
      };
    }

    return {
      valid: true,
      policy: policy
    };
  }

  /**
   * Obtener todas las versiones de política disponibles
   */
  getAllPolicyVersions() {
    return Object.keys(this.config.policy_versions || {});
  }

  /**
   * Obtener información de compatibilidad entre versiones
   */
  getCompatibilityInfo(fromVersion, toVersion) {
    const fromPolicy = this.getPolicyForVersion(fromVersion);
    const toPolicy = this.getPolicyForVersion(toVersion);

    const fromGates = new Set(fromPolicy.required_gates.default);
    const toGates = new Set(toPolicy.required_gates.default);

    const addedGates = Array.from(toGates).filter(g => !fromGates.has(g));
    const removedGates = Array.from(fromGates).filter(g => !toGates.has(g));

    const thresholdChanges = {};
    for (const [gate, threshold] of Object.entries(toPolicy.thresholds)) {
      const oldThreshold = fromPolicy.thresholds[gate];
      if (oldThreshold !== undefined && oldThreshold !== threshold) {
        thresholdChanges[gate] = {
          from: oldThreshold,
          to: threshold
        };
      }
    }

    return {
      from_version: fromVersion,
      to_version: toVersion,
      added_gates: addedGates,
      removed_gates: removedGates,
      threshold_changes: thresholdChanges,
      is_breaking: addedGates.length > 0 || Object.keys(thresholdChanges).length > 0
    };
  }
}

export default PolicyVersionManager;
