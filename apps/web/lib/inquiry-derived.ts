import type { AiReview } from '@zeiro/core';

type Analysis = {
  category?: string;
  urgency?: 'high' | 'medium' | 'low';
  confidence?: number;
  reason?: string;
  requiresTaxJudgment?: boolean;
  failureType?: string;
  aiReview?: AiReview;
};

type WithAnalysis = { analysis: unknown };

function read(item: WithAnalysis): Analysis {
  const a = item.analysis;
  return a && typeof a === 'object' && !Array.isArray(a) ? (a as Analysis) : {};
}

export function readCategory(item: WithAnalysis): string {
  return read(item).category ?? 'その他';
}

export function readConfidence(item: WithAnalysis): number | null {
  const c = read(item).confidence;
  return typeof c === 'number' ? c : null;
}

export function readUrgent(item: WithAnalysis): boolean {
  return read(item).urgency === 'high';
}

export function readReason(item: WithAnalysis): string | null {
  return read(item).reason ?? null;
}

export function readFailureType(item: WithAnalysis): string | null {
  return read(item).failureType ?? null;
}

export function readAiReview(item: WithAnalysis): AiReview | null {
  return read(item).aiReview ?? null;
}

export function readSenderName(item: { headers: unknown }): string | null {
  const h = item.headers;
  if (!h || typeof h !== 'object' || Array.isArray(h)) return null;
  const name = (h as { fromName?: unknown }).fromName;
  return typeof name === 'string' && name.trim().length > 0 ? name.trim() : null;
}
