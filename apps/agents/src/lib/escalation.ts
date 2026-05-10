import { ESCALATION_CONFIDENCE_THRESHOLD, type TriageResult, URGENT_KEYWORDS } from '@zeiro/core';

export type EscalationDecision = {
  mustEscalate: boolean;
  reason: string;
};

export function shouldEscalate(triage: TriageResult, body: string): EscalationDecision {
  if (triage.category === '税務質問' && triage.requiresTaxJudgment) {
    return { mustEscalate: true, reason: '税務判断を含む質問' };
  }
  if (triage.confidence < ESCALATION_CONFIDENCE_THRESHOLD) {
    return { mustEscalate: true, reason: '分類信頼度が閾値未満' };
  }
  if (triage.category === '顧問契約') {
    return { mustEscalate: true, reason: '顧問契約カテゴリは全件レビュー必須' };
  }
  for (const keyword of URGENT_KEYWORDS) {
    if (body.includes(keyword)) {
      return { mustEscalate: true, reason: `緊急キーワード検出: ${keyword}` };
    }
  }
  return { mustEscalate: false, reason: '自動下書き対象' };
}
