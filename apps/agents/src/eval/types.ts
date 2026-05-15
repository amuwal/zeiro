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
  // Fraction of `mustMentionSources` retrieved by hybrid search (independent
  // of whether the drafter actually cited them). Catches retrieval regressions
  // that are hidden when the drafter compensates with a different source.
  retrievalRecall: number;
  retrievedHitCount: number;
  // Fraction of returned citations whose snippet is a substring of the source
  // document. Anthropic's Citations API guarantees this in principle; we
  // verify it to catch any drift between cited_text and the supplied content.
  citationAccuracy: number;
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
    avgRetrievalRecall: number;
    avgCitationAccuracy: number;
  };
};
