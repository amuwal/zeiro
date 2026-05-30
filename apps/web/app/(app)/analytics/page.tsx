import { listRecentComplianceEvents } from '@zeiro/db';
import { redirect } from 'next/navigation';
import { AuditEvents } from '@/components/analytics/audit-events';
import { CategoryDistribution } from '@/components/analytics/category-distribution';
import { KpiCard } from '@/components/analytics/kpi-card';
import { PeriodPicker } from '@/components/analytics/period-picker';
import { getCategoryDistribution, getWindowAnalytics } from '@/lib/analytics';
import { resolveWindow } from '@/lib/analytics-window';
import { ctxCan } from '@/lib/authz';
import { buildKpiCards } from '@/lib/dashboard-kpis';
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

  const kpis = buildKpiCards(analytics);

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
