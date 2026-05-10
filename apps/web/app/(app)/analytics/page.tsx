import { AuditEvents } from '@/components/analytics/audit-events';
import { CategoryDistribution } from '@/components/analytics/category-distribution';
import { KpiCard, type KpiInput } from '@/components/analytics/kpi-card';
import { getCategoryDistribution, getKpiSnapshot, TARGET_ESCALATION_PCT } from '@/lib/analytics';
import { requireFirmContext } from '@/lib/firm-context';

export default async function AnalyticsPage() {
  const { firmId } = await requireFirmContext();
  const [snapshot, distribution] = await Promise.all([
    getKpiSnapshot(firmId),
    getCategoryDistribution(firmId),
  ]);

  const kpis: KpiInput[] = [
    {
      label: 'エスカレーション率',
      value: snapshot.escalationRate * 100,
      decimals: 1,
      unit: '%',
      target: `目標 ${TARGET_ESCALATION_PCT}%`,
      delta: '-0.6%',
      deltaUp: false,
      good: true,
      barPct: snapshot.escalationRate * 100,
      targetMarkerPct: TARGET_ESCALATION_PCT,
      spark: [38, 35, 36, 34, 33, 32, 31],
    },
    {
      label: '下書き採用率',
      value: snapshot.adoptionRate * 100,
      unit: '%',
      target: '目標 60%',
      delta: '+4.2%',
      deltaUp: true,
      good: true,
      barPct: snapshot.adoptionRate * 100,
      sparkColor: 'var(--positive)',
      spark: [58, 60, 61, 64, 63, 65, 67],
    },
    {
      label: '平均一次対応時間',
      value: snapshot.avgResponseMinutes,
      decimals: 1,
      unit: '分',
      target: '目標 3分以下',
      delta: '-22%',
      deltaUp: false,
      good: true,
      barPct: 80,
      spark: [4.1, 3.5, 3.0, 2.8, 2.6, 2.5, 2.4],
    },
    {
      label: '今月の工数削減',
      value: snapshot.hoursSavedThisMonth,
      unit: 'h',
      target: '目標 100h',
      delta: '+18h',
      deltaUp: true,
      good: true,
      barPct: 100,
      sparkColor: 'var(--positive)',
      spark: [88, 95, 110, 118, 125, 138, 142],
    },
  ];

  return (
    <div className="an-pane anim-stagger">
      <div className="an-head">
        <div>
          <div className="an-title">パフォーマンス</div>
          <div className="kb-sub">2026年5月 · 全担当・全顧問先</div>
        </div>
        <div className="an-period">
          <button type="button">今日</button>
          <button type="button">7日</button>
          <button type="button" className="active">
            30日
          </button>
          <button type="button">四半期</button>
        </div>
      </div>

      <div className="kpi-grid">
        {kpis.map((k) => (
          <KpiCard key={k.label} {...k} />
        ))}
      </div>

      <div className="an-grid">
        <CategoryDistribution rows={distribution} />
        <AuditEvents />
      </div>
    </div>
  );
}
