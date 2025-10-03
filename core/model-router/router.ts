import fs from 'fs';
import YAML from 'yaml';

type Task = {
  kind: string;
  maxTokens?: number;
  budgetTier?: 'low' | 'mid' | 'high';
};

const cfg = YAML.parse(fs.readFileSync('config/models.yaml', 'utf8'));

export function pickModel(t: Task) {
  const route = cfg.routes.find((r: any) => r.when.kind === t.kind)?.prefer ?? cfg.fallback;
  const candidate = route[0];
  const maxTokens = t.maxTokens ?? cfg.defaults.max_tokens;

  return {
    id: candidate.id,
    maxTokens,
    temperature: cfg.defaults.temperature,
    reason: candidate.reason,
  };
}
