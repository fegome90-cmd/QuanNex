export interface InputPayload {
  budget?: number;
  maxTokens?: number;
  text?: string;
}

export class InputGuardrails {
  constructor(
    private maxBudget = 1_000_000,
    private minBudget = 10_000,
    private maxTokens = 8000
  ) {}

  validate(p: InputPayload) {
    if (p.budget !== undefined) {
      if (p.budget > this.maxBudget) throw new Error(`budget>${this.maxBudget}`);
      if (p.budget < this.minBudget) throw new Error(`budget<${this.minBudget}`);
    }
    if (p.maxTokens && p.maxTokens > this.maxTokens) throw new Error(`maxTokens>${this.maxTokens}`);
    if (p.text !== undefined && p.text.length === 0) throw new Error('text empty');
    return true;
  }
}
