import { getCategoryTheme } from '@zeiro/core';
import type { InquiryWithClient } from '@zeiro/db';
import { ConfidenceBar } from '@/components/ui/confidence-bar';
import { readCategory, readConfidence, readReason, readUrgent } from '@/lib/inquiry-derived';

export function AiAnalysis({ inquiry }: { inquiry: InquiryWithClient }) {
  const category = readCategory(inquiry);
  const confidence = readConfidence(inquiry);
  const urgent = readUrgent(inquiry);
  const reason = readReason(inquiry);
  const theme = getCategoryTheme(category);

  return (
    <div className="section">
      <div className="section-head">
        <span>AI ANALYSIS</span>
      </div>
      <div className="ai-banner">
        <div className="ai-icon">AI</div>
        <div className="ai-content">
          <div className="ai-row">
            <span className="label">分類</span>
            <span className="val" style={{ color: theme.color }}>
              ● {theme.jp}
            </span>
            <span className="sep" />
            <span className="label">信頼度</span>
            {confidence !== null && (
              <>
                <ConfidenceBar score={confidence} />
                <span className="val mono">{Math.round(confidence * 100)}%</span>
              </>
            )}
            <span className="sep" />
            <span className="label">緊急度</span>
            <span className="val" style={{ color: urgent ? 'var(--urgent)' : 'var(--ink-2)' }}>
              {urgent ? '高' : '通常'}
            </span>
          </div>
          {reason && <div className="ai-reason">{reason}</div>}
        </div>
      </div>
    </div>
  );
}
