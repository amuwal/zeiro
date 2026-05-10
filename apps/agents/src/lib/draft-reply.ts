import type { DraftResult, TriageResult } from '@zeiro/core';
import { ensureRePrefix } from '@zeiro/email';
import { draftPrompt } from '../mastra/prompts/draft';
import { callDrafterWithCitations, type DrafterResult } from './anthropic-draft';
import { shouldEscalate } from './escalation';
import { hybridSearch } from './retrieval';

type Input = {
  firmId: string;
  clientNotes: string | null;
  subject: string;
  body: string;
};

export async function draftReply(input: Input, triage: TriageResult): Promise<DraftResult> {
  const decision = shouldEscalate(triage, input.body);
  if (decision.mustEscalate) {
    return { kind: 'escalate', triage, reason: decision.reason };
  }

  const hits = await hybridSearch(input.firmId, input.body);
  if (hits.length === 0) {
    return { kind: 'no_draft', triage, reason: '関連するナレッジが見つかりませんでした' };
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY missing');

  const result = await callDrafterWithCitations({
    apiKey,
    systemPrompt: draftPrompt,
    userMessage: buildUserMessage(input, triage),
    documents: hits.map((h) => ({ source: h.source, content: h.content })),
  });

  if (!verifyCitationCoverage(result)) {
    return { kind: 'no_draft', triage, reason: '引用の根拠が不足しています' };
  }

  return {
    kind: 'draft',
    triage,
    subject: ensureRePrefix(input.subject),
    body: result.text,
    citations: result.citations.map((c) => ({ source: c.source, snippet: c.citedText })),
    confidence: confidenceFromCitations(result.citations.length),
  };
}

export function verifyCitationCoverage(result: DrafterResult): boolean {
  return result.citations.length >= 1;
}

function confidenceFromCitations(count: number): number {
  return Math.min(1, count / 3);
}

function buildUserMessage(input: Input, triage: TriageResult): string {
  const notes = input.clientNotes ? `\n\n顧問先メモ: ${input.clientNotes}` : '';
  return `カテゴリ: ${triage.category}${notes}\n\n件名: ${input.subject}\n\n本文:\n${input.body}\n\n上記の問い合わせに対する返信を作成してください。`;
}
