export type GoldenCase = {
  id: string;
  description: string;
  message: {
    subject: string;
    body: string;
  };
  expected: {
    kind: 'draft' | 'no_draft' | 'escalate';
    minCitations?: number;
    mustMentionSources?: string[];
  };
};

export type CaseResult = {
  id: string;
  expected: GoldenCase['expected']['kind'];
  actual: 'draft' | 'no_draft' | 'escalate';
  citationCount: number;
  matchedExpectedSources: number;
  expectedSourceCount: number;
  passed: boolean;
  failures: string[];
  durationMs: number;
};

export type EvalReport = {
  cases: CaseResult[];
  summary: {
    total: number;
    passed: number;
    sendWithoutEditCandidate: number;
    escalationRate: number;
    avgCitationsPerDraft: number;
  };
};
