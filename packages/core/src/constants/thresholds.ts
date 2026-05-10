export const ESCALATION_CONFIDENCE_THRESHOLD = 0.75;
export const TARGET_ESCALATION_RATE = 0.32;
export const ESCALATION_RATE_TOLERANCE = 0.05;
export const DRAFT_GENERATION_TIMEOUT_MS = 90_000;
export const MAX_INBOUND_DELAY_MS = 5 * 60_000;

export const URGENT_KEYWORDS = ['至急', 'クレーム', '税務調査', '差押え', '差し押さえ'] as const;

export const TRIAGE_MODEL = 'gemini-2.5-flash';
export const DRAFT_MODEL = 'claude-sonnet-4-6';
export const EMBEDDING_MODEL = 'text-embedding-3-small';
export const RERANK_MODEL = 'rerank-v3.5';
export const RERANK_THRESHOLD = 0.3;
export const RETRIEVAL_VECTOR_TOP = 30;
export const RETRIEVAL_BM25_TOP = 30;
export const RETRIEVAL_FUSE_TOP = 10;
export const RETRIEVAL_FINAL_TOP = 5;
