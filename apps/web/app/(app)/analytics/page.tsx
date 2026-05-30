import { listRecentComplianceEvents } from '@zeiro/db';
import { redirect } from 'next/navigation';
import { AuditEvents } from '@/components/analytics/audit-events';
import { CategoryDistribution } from '@/components/analytics/category-distribution';
import { KpiCard, type KpiInput } from '@/components/analytics/kpi-card';
import { PeriodPicker } from '@/components/analytics/period-picker';
import {
  formatDeltaPct,
  formatDeltaPoints,
  getCategoryDistribution,
  getWindowAnalytics,
  pctDelta,
  TARGET_ESCALATION_PCT,
} from '@/lib/analytics';
import { resolveWindow } from '@/lib/analytics-window';
import { ctxCan } from '@/lib/authz';
import { requireFirmContext } from '@/lib/firm-context';

type SearchParams = { window?: string };

export default async function AnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const ctx = await requireFirmContext();
  if (!ctxCan(ctx, 'analytics.viewFirm')) redirect('/home');
  const { firmId } = ctx;
  const params = await searchParams;
  const resolution = resolveWindow(params.window);
  const admin = ctxCan(ctx, 'audit.view');

  const [analytics, distribution, complianceEvents] = await Promise.all([
    getWindowAnalytics(firmId, resolution),
    getCategoryDistribution(firmId, resolution),
    listRecentComplianceEvents(firmId),
  ]);

  const kpis = buildKpis(analytics);

  return (
    <div className="an-pane anim-stagger">
      <div className="an-head">
        <div>
          <div className="an-title">パフォーマンス</div>
          <div className="kb-sub">
            {resolution.label} · 計 {analytics.current.total}件
          </div>
        </div>
        <PeriodPicker active={resolution.window} />
      </div>

      <div className="kpi-grid">
        {kpis.map((k) => (
          <KpiCard key={k.label} {...k} />
        ))}
      </div>

      <div className="an-grid">
        <CategoryDistribution rows={distribution} windowLabel={resolution.label} />
        <AuditEvents rows={complianceEvents} admin={admin} />
      </div>
    </div>
  );
}

function buildKpis(a: Awaited<ReturnType<typeof getWindowAnalytics>>): KpiInput[] {
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
      // total = conversations (chain), messages = raw customer turns.
      // Surface both so a 1-conversation / 3-message inbox isn't confusing.
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
