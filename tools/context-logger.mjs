#!/usr/bin/env node
/**
 * @fileoverview Context Logger para Reestructuración MCP
 * @description Registra y mantiene el contexto de agentes MCP durante la reestructuración
 */

import { writeFileSync, readFileSync, existsSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PROJECT_ROOT = join(__dirname, '..');
const LOGS_DIR = join(PROJECT_ROOT, '.reports', 'restructure-logs');
const CONTEXT_LOG = join(LOGS_DIR, 'context-log.json');
const PROMPT_LOG = join(LOGS_DIR, 'prompt-log.json');

// Asegurar que el directorio de logs existe
if (!existsSync(LOGS_DIR)) {
  mkdirSync(LOGS_DIR, { recursive: true });
}

class ContextLogger {
  constructor() {
    this.contextLog = this.loadLog(CONTEXT_LOG);
    this.promptLog = this.loadLog(PROMPT_LOG);
  }

  loadLog(filePath) {
    if (existsSync(filePath)) {
      try {
        return JSON.parse(readFileSync(filePath, 'utf8'));
      } catch (error) {
        console.warn(`Warning: Could not load log file ${filePath}:`, error.message);
        return [];
      }
    }
    return [];
  }

  saveLog(data, filePath) {
    try {
      writeFileSync(filePath, JSON.stringify(data, null, 2));
    } catch (error) {
      console.error(`Error saving log to ${filePath}:`, error.message);
    }
  }

  logContext(agentName, input, output, metadata = {}) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      agent: agentName,
      input: {
        sources: input.sources || [],
        selectors: input.selectors || [],
        max_tokens: input.max_tokens || 512
      },
      output: {
        schema_version: output.schema_version,
        agent_version: output.agent_version,
        context_bundle: output.context_bundle ? output.context_bundle.substring(0, 200) + '...' : null,
        provenance: output.provenance || [],
        stats: output.stats || {},
        trace: output.trace || []
      },
      metadata: {
        ...metadata,
        input_size: JSON.stringify(input).length,
        output_size: JSON.stringify(output).length,
        processing_time: metadata.processing_time || 0
      }
    };

    this.contextLog.push(logEntry);
    this.saveLog(this.contextLog, CONTEXT_LOG);
    
    console.log(`📝 Context logged for ${agentName} at ${logEntry.timestamp}`);
    return logEntry;
  }

  logPrompt(agentName, input, output, metadata = {}) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      agent: agentName,
      input: {
        goal: input.goal || '',
        style: input.style || 'default',
        constraints: input.constraints || [],
        context_refs: input.context_refs || [],
        ruleset_refs: input.ruleset_refs || []
      },
      output: {
        schema_version: output.schema_version,
        agent_version: output.agent_version,
        system_prompt: output.system_prompt ? output.system_prompt.substring(0, 200) + '...' : null,
        user_prompt: output.user_prompt || '',
        guardrails: output.guardrails || [],
        trace: output.trace || []
      },
      metadata: {
        ...metadata,
        input_size: JSON.stringify(input).length,
        output_size: JSON.stringify(output).length,
        processing_time: metadata.processing_time || 0
      }
    };

    this.promptLog.push(logEntry);
    this.saveLog(this.promptLog, PROMPT_LOG);
    
    console.log(`📝 Prompt logged for ${agentName} at ${logEntry.timestamp}`);
    return logEntry;
  }

  logRules(agentName, input, output, metadata = {}) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      agent: agentName,
      input: {
        policy_refs: input.policy_refs || [],
        target_path: input.target_path || '',
        check_mode: input.check_mode || 'validate'
      },
      output: {
        schema_version: output.schema_version,
        agent_version: output.agent_version,
        rules_compiled: output.rules_compiled ? output.rules_compiled.length : 0,
        violations: output.violations || [],
        advice: output.advice || [],
        trace: output.trace || []
      },
      metadata: {
        ...metadata,
        input_size: JSON.stringify(input).length,
        output_size: JSON.stringify(output).length,
        processing_time: metadata.processing_time || 0
      }
    };

    this.promptLog.push(logEntry); // Usar prompt log para rules también
    this.saveLog(this.promptLog, PROMPT_LOG);
    
    console.log(`📝 Rules logged for ${agentName} at ${logEntry.timestamp}`);
    return logEntry;
  }

  getContextHistory(agentName = null, limit = 10) {
    const filtered = agentName 
      ? this.contextLog.filter(entry => entry.agent === agentName)
      : this.contextLog;
    
    return filtered.slice(-limit);
  }

  getPromptHistory(agentName = null, limit = 10) {
    const filtered = agentName 
      ? this.promptLog.filter(entry => entry.agent === agentName)
      : this.promptLog;
    
    return filtered.slice(-limit);
  }

  generateReport() {
    const report = {
      generated_at: new Date().toISOString(),
      summary: {
        total_context_entries: this.contextLog.length,
        total_prompt_entries: this.promptLog.length,
        agents_used: [...new Set([...this.contextLog.map(e => e.agent), ...this.promptLog.map(e => e.agent)])],
        time_range: {
          start: this.contextLog[0]?.timestamp || this.promptLog[0]?.timestamp,
          end: this.contextLog[this.contextLog.length - 1]?.timestamp || this.promptLog[this.promptLog.length - 1]?.timestamp
        }
      },
      context_stats: this.analyzeContextStats(),
      prompt_stats: this.analyzePromptStats(),
      recommendations: this.generateRecommendations()
    };

    const reportPath = join(LOGS_DIR, 'restructure-report.json');
    this.saveLog(report, reportPath);
    
    console.log(`📊 Report generated: ${reportPath}`);
    return report;
  }

  analyzeContextStats() {
    const stats = {
      total_sources_processed: 0,
      total_tokens_estimated: 0,
      average_processing_time: 0,
      most_used_sources: {},
      agent_usage: {}
    };

    this.contextLog.forEach(entry => {
      stats.total_sources_processed += entry.input.sources.length;
      stats.total_tokens_estimated += entry.output.stats.tokens_estimated || 0;
      stats.average_processing_time += entry.metadata.processing_time || 0;
      
      // Contar fuentes más usadas
      entry.input.sources.forEach(source => {
        stats.most_used_sources[source] = (stats.most_used_sources[source] || 0) + 1;
      });
      
      // Contar uso por agente
      stats.agent_usage[entry.agent] = (stats.agent_usage[entry.agent] || 0) + 1;
    });

    if (this.contextLog.length > 0) {
      stats.average_processing_time = stats.average_processing_time / this.contextLog.length;
    }

    return stats;
  }

  analyzePromptStats() {
    const stats = {
      total_goals_processed: 0,
      style_distribution: {},
      constraint_usage: {},
      agent_usage: {}
    };

    this.promptLog.forEach(entry => {
      if (entry.input.goal) {
        stats.total_goals_processed++;
      }
      
      // Distribución de estilos
      const style = entry.input.style || 'default';
      stats.style_distribution[style] = (stats.style_distribution[style] || 0) + 1;
      
      // Uso de constraints
      if (entry.input.constraints && Array.isArray(entry.input.constraints)) {
        entry.input.constraints.forEach(constraint => {
          stats.constraint_usage[constraint] = (stats.constraint_usage[constraint] || 0) + 1;
        });
      }
      
      // Uso por agente
      stats.agent_usage[entry.agent] = (stats.agent_usage[entry.agent] || 0) + 1;
    });

    return stats;
  }

  generateRecommendations() {
    const recommendations = [];
    
    // Análisis de fuentes más usadas
    const contextStats = this.analyzeContextStats();
    const topSources = Object.entries(contextStats.most_used_sources)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5);
    
    if (topSources.length > 0) {
      recommendations.push({
        type: 'source_optimization',
        message: 'Consider caching frequently accessed sources',
        details: topSources
      });
    }
    
    // Análisis de patrones de uso
    const agentUsage = contextStats.agent_usage;
    const mostUsedAgent = Object.entries(agentUsage).sort(([,a], [,b]) => b - a)[0];
    
    if (mostUsedAgent) {
      recommendations.push({
        type: 'agent_optimization',
        message: `Agent ${mostUsedAgent[0]} is used most frequently (${mostUsedAgent[1]} times)`,
        details: { agent: mostUsedAgent[0], usage_count: mostUsedAgent[1] }
      });
    }
    
    return recommendations;
  }
}

// CLI interface
if (import.meta.url === `file://${process.argv[1]}`) {
  const logger = new ContextLogger();
  
  const command = process.argv[2];
  
  switch (command) {
    case 'report':
      const report = logger.generateReport();
      console.log(JSON.stringify(report, null, 2));
      break;
      
    case 'context':
      const agent = process.argv[3];
      const limit = parseInt(process.argv[4]) || 10;
      const contextHistory = logger.getContextHistory(agent, limit);
      console.log(JSON.stringify(contextHistory, null, 2));
      break;
      
    case 'prompt':
      const promptAgent = process.argv[3];
      const promptLimit = parseInt(process.argv[4]) || 10;
      const promptHistory = logger.getPromptHistory(promptAgent, promptLimit);
      console.log(JSON.stringify(promptHistory, null, 2));
      break;
      
    default:
      console.log('Usage:');
      console.log('  node tools/context-logger.mjs report');
      console.log('  node tools/context-logger.mjs context [agent] [limit]');
      console.log('  node tools/context-logger.mjs prompt [agent] [limit]');
      break;
  }
}

export default ContextLogger;
