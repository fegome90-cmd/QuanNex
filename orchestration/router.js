import { readFileSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse } from 'yaml';
import { minimatch } from 'minimatch';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const DEFAULT_CONFIG_PATH = join(__dirname, 'router.yaml');

function normalizeList(value) {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

function parseComparator(expression) {
  if (typeof expression === 'number') {
    return value => value >= expression;
  }

  if (typeof expression !== 'string') {
    return () => true;
  }

  const trimmed = expression.trim();
  const match = trimmed.match(/^(>=|<=|>|<|==|=)\s*(\d*\.?\d+)$/);
  if (!match) {
    const threshold = Number.parseFloat(trimmed);
    if (Number.isNaN(threshold)) {
      return () => true;
    }
    return value => value >= threshold;
  }

  const [, operator, numeric] = match;
  const threshold = Number.parseFloat(numeric);

  switch (operator) {
    case '>':
      return value => value > threshold;
    case '>=':
      return value => value >= threshold;
    case '<':
      return value => value < threshold;
    case '<=':
      return value => value <= threshold;
    case '=':
    case '==':
      return value => value === threshold;
    default:
      return value => value >= threshold;
  }
}

function artifactsMatch(ruleArtifacts, artifacts) {
  if (!ruleArtifacts) return true;
  const list = normalizeList(artifacts);
  const include = normalizeList(ruleArtifacts.include);
  const exclude = normalizeList(ruleArtifacts.exclude);

  if (include.length > 0) {
    const hasMatch = list.some(artifact =>
      include.some(pattern =>
        minimatch(artifact, pattern, { dot: true, matchBase: true })
      )
    );
    if (!hasMatch) return false;
  }

  if (exclude.length > 0) {
    const blocked = list.some(artifact =>
      exclude.some(pattern =>
        minimatch(artifact, pattern, { dot: true, matchBase: true })
      )
    );
    if (blocked) return false;
  }

  return true;
}

function evaluateFallback(condition, signals) {
  if (!condition) return true;
  if (condition === 'no_route_matched') return true;

  const match = condition.match(/^confidence\s*(>=|<=|>|<|==|=)\s*(\d*\.?\d+)$/);
  if (match) {
    const comparator = parseComparator(`${match[1]}${match[2]}`);
    return comparator(signals.confidence ?? 0);
  }

  return false;
}

export default class RouterEngine {
  constructor(configPath = DEFAULT_CONFIG_PATH) {
    this.configPath = configPath;
    this.cachedConfig = null;
    this.cachedMtime = 0;
  }

  route(task) {
    const config = this.loadConfig();
    const signals = {
      intent: task.intent,
      confidence: Number.parseFloat(task.confidence ?? 0) || 0,
      artifacts: normalizeList(task.artifacts),
      threadStateId: task.threadStateId || task.thread_state_id || null,
      metadata: task.metadata || {}
    };

    const matched = (config.routes || []).find(route =>
      this.matchRoute(route.match || {}, signals)
    );

    if (matched) {
      const budgetName = matched.budget || config.defaults?.budget_alias || null;
      return {
        decision: 'route',
        route: {
          name: matched.name,
          target_agent: matched.target_agent,
          handoff_template: matched.handoff_template,
          emit_context: matched.emit_context || { include_payload: false },
          policy_gates: matched.policy_gates || [],
          metrics: matched.metrics || {}
        },
        budget: this.resolveBudget(config, budgetName),
        telemetry: {
          router_rule_id: matched.metrics?.route_id || matched.name,
          thread_state_id: signals.threadStateId,
          signals: {
            intent: signals.intent,
            confidence: signals.confidence,
            artifacts: signals.artifacts.length
          }
        }
      };
    }

    const fallback = (config.fallbacks || []).find(item =>
      evaluateFallback(item.condition, signals)
    );

    if (fallback) {
      return {
        decision: 'fallback',
        action: fallback.action || 'route_to',
        target_agent: fallback.target_agent || config.defaults?.fallback_agent,
        note: fallback.note || null,
        telemetry: {
          reason: fallback.condition,
          thread_state_id: signals.threadStateId
        }
      };
    }

    return {
      decision: 'fallback',
      action: 'route_to',
      target_agent: config.defaults?.fallback_agent || 'orchestrator.fallback',
      note: 'No declarative rule matched',
      telemetry: {
        reason: 'no_route',
        thread_state_id: signals.threadStateId
      }
    };
  }

  matchRoute(matchConfig, signals) {
    if (matchConfig.intent && matchConfig.intent !== signals.intent) {
      return false;
    }

    if (matchConfig.confidence) {
      const comparator = parseComparator(matchConfig.confidence);
      if (!comparator(signals.confidence)) {
        return false;
      }
    }

    if (matchConfig.artifacts) {
      if (!artifactsMatch(matchConfig.artifacts, signals.artifacts)) {
        return false;
      }
    }

    return true;
  }

  resolveBudget(config, budgetName) {
    if (!budgetName) {
      return { name: null, constraints: null };
    }
    const budgets = config.budgets || {};
    const budget = budgets[budgetName];
    if (!budget) {
      return { name: budgetName, constraints: null };
    }
    return { name: budgetName, constraints: budget };
  }

  loadConfig(force = false) {
    const stats = statSync(this.configPath);
    const mtime = stats.mtimeMs;
    if (!force && this.cachedConfig && this.cachedMtime === mtime) {
      return this.cachedConfig;
    }
    const raw = readFileSync(this.configPath, 'utf8');
    this.cachedConfig = parse(raw);
    this.cachedMtime = mtime;
    return this.cachedConfig;
  }
}
