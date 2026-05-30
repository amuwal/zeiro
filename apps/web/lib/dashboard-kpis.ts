import type { KpiInput } from '@/components/analytics/kpi-card';
import {
  formatDeltaPct,
  formatDeltaPoints,
  type getWindowAnalytics,
  pctDelta,
  TARGET_ESCALATION_PCT,
} from '@/lib/analytics';

// Shared KPI-card builder used by both the analytics page and the home
// dashboard so the two surfaces show identical, cohesive cards.
export function buildKpiCards(a: Awaited<ReturnType<typeof getWindowAnalytics>>): KpiInput[] {
  const escalationDelta = formatDeltaPoints(a.current.escalationRate, a.previous.escalationRate);
  const escalationDeltaIsGood = a.current.escalationRate <= a.previous.escalationRate;

  const adoptionDelta = formatDeltaPoints(a.current.adoptionRate, a.previous.adoptionRate);
  const adoptionDeltaIsGood = a.current.adoptionRate >= a.previous.adoptionRate;

  const responseCurrent = a.current.avgResponseMinutes ?? 0;
  const responsePrevious = a.previous.avgResponseMinutes ?? 0;
  const responseDelta =
    a.previous.avgResponseMinutes === null
      ? '—'
      : formatDeltaPct(pctDelta(responseCurrent, responsePrevious));
  const responseDeltaIsGood = responseCurrent <= responsePrevious;

  const totalDelta = formatDeltaPct(pctDelta(a.current.total, a.previous.total));
  const totalDeltaIsUp = a.current.total >= a.previous.total;

  return [
    {
      label: 'エスカレーション率',
      value: a.current.escalationRate * 100,
      decimals: 1,
      unit: '%',
      target: `目標 ${TARGET_ESCALATION_PCT}% 以下`,
      delta: escalationDelta,
      deltaUp: a.current.escalationRate >= a.previous.escalationRate,
      good: escalationDeltaIsGood,
      barPct: Math.min(100, a.current.escalationRate * 100 * 2),
      targetMarkerPct: TARGET_ESCALATION_PCT * 2,
      spark: a.spark.escalated,
    },
    {
      label: '下書き採用率',
      value: a.current.adoptionRate * 100,
      decimals: 1,
      unit: '%',
      target: '目標 60% 以上',
      delta: adoptionDelta,
      deltaUp: a.current.adoptionRate >= a.previous.adoptionRate,
      good: adoptionDeltaIsGood,
      barPct: a.current.adoptionRate * 100,
      sparkColor: 'var(--positive)',
      spark: a.spark.sent,
    },
    {
      label: '平均一次対応時間',
      value: responseCurrent,
      decimals: 1,
      unit: '分',
      target: '目標 3分以下',
      delta: responseDelta,
      deltaUp: responseCurrent >= responsePrevious,
      good: responseDeltaIsGood,
      barPct: Math.min(100, (responseCurrent / 10) * 100),
      spark: a.spark.totals,
    },
    {
      label: '総問い合わせ数',
      value: a.current.total,
      unit: '件',
      target: `メッセージ ${a.current.messages}件 · 前期間 ${a.previous.total}件`,
      delta: totalDelta,
      deltaUp: totalDeltaIsUp,
      good: true,
      barPct: 100,
      sparkColor: 'var(--accent)',
      spark: a.spark.totals,
    },
  ];
}
