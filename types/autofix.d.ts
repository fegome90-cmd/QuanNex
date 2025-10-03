export interface AutofixAction {
  type: string;
  name?: string;
  dev?: boolean;
  key?: string;
  value?: string;
}

export interface AutofixOptions {
  actions: AutofixAction[];
  dryRun: boolean;
}

export interface AutofixResult {
  ok: boolean;
  dryRun: boolean;
  risk: number;
  log: string[];
}

export declare function autoFix(options: AutofixOptions): Promise<AutofixResult>;
