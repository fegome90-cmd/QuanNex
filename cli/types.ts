export interface ReviewIssue {
  id: string;
  type: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  message: string;
  where?: string;
  evidence?: string;
}

export interface ReviewReport {
  status: 'PASS' | 'FAIL';
  confidence: number;
  issues: ReviewIssue[];
  summary?: string;
  next_step: string;
  meta: {
    input: string;
    policy: string;
    generatedAt: string;
    version: string;
  };
}

export interface AppConfig {
  default_policy?: string;
  metrics_file?: string;
  policy_mapping?: Array<{
    paths: string[];
    policy: string;
  }>;
  detectors?: {
    headings?: {
      resumen?: string;
      total?: string;
    };
    factcheck?: {
      require_citation_near?: {
        units?: string;
        window?: number;
      };
      ignore_years?: boolean;
      min_digits?: number;
    };
    structure?: {
      required?: string[];
    };
  };
  thresholds?: {
    min_confidence?: number;
  };
}
