import { ESCALATION_RATE_TOLERANCE, TARGET_ESCALATION_RATE } from '@zeiro/core';
import type { InboxCounts } from '@zeiro/db';

export function EscalationCard({ counts }: { counts: InboxCounts }) {
  const rate = counts.all === 0 ? 0 : Math.round((counts.escalated / counts.all) * 100);
  const targetPct = Math.round(TARGET_ESCALATION_RATE * 100);
  const tolerancePct = Math.round(ESCALATION_RATE_TOLERANCE * 100);
  const inRange = rate <= targetPct + tolerancePct;
  return (
    <div className="escalation-card">
      <div className="escalation-head">
        <span>本日のエスカレーション率</span>
        <span>目標 {targetPct}%</span>
      </div>
      <div className="escalation-rate">
        <span>{rate}</span>
        <span className="pct">%</span>
      </div>
      <div className="escalation-bar">
        <i style={{ width: `${rate}%` }} />
        <span className="target" style={{ left: `${targetPct}%` }} />
      </div>
      <div className="escalation-meta">
        <span>
          {counts.escalated}件 / {counts.all}件
        </span>
        <span style={{ color: inRange ? 'var(--positive)' : 'var(--urgent)' }}>
          {inRange ? '正常範囲' : '要調整'}
        </span>
      </div>
    </div>
  );
}
