import { roleLabel } from '@zeiro/core';
import { getInboxCounts, getUser, listInquiryThreads } from '@zeiro/db';
import Link from 'next/link';
import { KpiCard } from '@/components/analytics/kpi-card';
import { EmptyRow, SectionCard, StatTile } from '@/components/dashboard/dashboard-parts';
import { SetupChecklist } from '@/components/onboarding/setup-checklist';
import { TestInquiryButton } from '@/components/onboarding/test-inquiry-button';
import { CategoryStripe } from '@/components/ui/category-pill';
import { Icon, type IconName } from '@/components/ui/icon';
import { StatusChip } from '@/components/ui/status-chip';
import { getWindowAnalytics } from '@/lib/analytics';
import { resolveWindow } from '@/lib/analytics-window';
import { ctxCan, viewerScope } from '@/lib/authz';
import { buildKpiCards } from '@/lib/dashboard-kpis';
import { requireFirmContext } from '@/lib/firm-context';
import { CATEGORY_TO_ID, shortTime } from '@/lib/inquiry-mappers';

const ACTIONABLE = new Set(['pending', 'drafted', 'escalated', 'unmatched']);
const PRIORITY: Record<string, number> = { escalated: 0, unmatched: 0, drafted: 1, pending: 2 };

function analysisOf(a: unknown): Record<string, unknown> {
  return (a ?? {}) as Record<string, unknown>;
}
function triageOf(a: unknown): Record<string, unknown> {
  return (analysisOf(a).triage ?? {}) as Record<string, unknown>;
}
function isUrgent(a: unknown): boolean {
  return triageOf(a).urgency === 'high' || analysisOf(a).urgency === 'high';
}
function catId(a: unknown): string {
  const jp = triageOf(a).category;
  return (typeof jp === 'string' ? CATEGORY_TO_ID[jp] : undefined) ?? 'other';
}

export default async function HomePage() {
  const ctx = await requireFirmContext();
  const scope = viewerScope(ctx);
  const isManager = ctxCan(ctx, 'analytics.viewFirm');
  const canSend = ctxCan(ctx, 'inquiry.send');

  const [me, counts, threads] = await Promise.all([
    getUser(ctx.userId),
    getInboxCounts(ctx.firmId, scope),
    listInquiryThreads(ctx.firmId, undefined, scope),
  ]);
  const analytics = isManager ? await getWindowAnalytics(ctx.firmId, resolveWindow('30d')) : null;
  const kpiCards = analytics ? buildKpiCards(analytics) : [];

  const queue = threads
    .filter((t) => ACTIONABLE.has(t.status))
    .sort((a, b) => {
      const pa = PRIORITY[a.status] ?? 3;
      const pb = PRIORITY[b.status] ?? 3;
      if (pa !== pb) return pa - pb;
      const ua = isUrgent(a.analysis) ? 0 : 1;
      const ub = isUrgent(b.analysis) ? 0 : 1;
      if (ua !== ub) return ua - ub;
      return b.receivedAt.getTime() - a.receivedAt.getTime();
    })
    .slice(0, 8);

  const needsAction = counts.drafted + counts.escalated + counts.pending + counts.unmatched;

  // Empty firm: KPIs and the queue would be meaningless. Lead with what Zeiro
  // does + how the flow works + setup, so the app's purpose is clear without
  // any data.
  if (counts.all === 0) {
    return (
      <div className="kb-pane anim-stagger">
        <header className="dash-head">
          <div>
            <h1 className="dash-greeting">
              {me?.name ? `${me.name} さん、ようこそ` : 'ようこそ'}
              <span className={`role-chip role-${ctx.role}`}>{roleLabel(ctx.role)}</span>
            </h1>
            <p className="dash-sub">
              Zeiro
              は顧問先からの問い合わせを自動で分類し、事務所のナレッジに基づいた返信の下書きを作成します。税理士は確認して送信するだけです。
            </p>
          </div>
        </header>
        <ol className="dash-flow">
          <FlowStep
            n={1}
            icon="inbox"
            title="受信"
            sub="顧問先からのメール・LINE・Webフォームを自動取込"
          />
          <FlowStep
            n={2}
            icon="spark"
            title="AIが分類・下書き"
            sub="5カテゴリに分類し、ナレッジを引用した下書きを生成"
          />
          <FlowStep
            n={3}
            icon="check"
            title="税理士がレビュー"
            sub="内容を確認・編集。判断が必要な案件はエスカレーション"
          />
          <FlowStep
            n={4}
            icon="send"
            title="送信"
            sub="そのまま送信、または編集して送信。全操作を監査ログに記録"
          />
        </ol>
        <div className="mt-4 flex flex-col gap-1.5">
          <TestInquiryButton />
          <span className="text-[12px] text-muted">
            サンプルの問い合わせを送って、AIの下書きをその場で確認できます。
          </span>
        </div>
        {ctxCan(ctx, 'member.manage') && <SetupChecklist />}
      </div>
    );
  }

  return (
    <div className="kb-pane anim-stagger">
      <header className="dash-head">
        <div>
          <h1 className="dash-greeting">
            {me?.name ? `${me.name} さん` : 'ホーム'}
            <span className={`role-chip role-${ctx.role}`}>{roleLabel(ctx.role)}</span>
          </h1>
          <p className="dash-sub">
            {needsAction > 0
              ? `対応が必要な案件が ${needsAction} 件あります。`
              : '対応待ちの案件はありません。お疲れさまです。'}
          </p>
        </div>
        <Link href="/inbox" className="btn btn-primary">
          <Icon name="inbox" size={13} /> 受信トレイへ
        </Link>
      </header>

      {isManager ? (
        <div className="kpi-grid">
          {kpiCards.map((k) => (
            <KpiCard key={k.label} {...k} />
          ))}
        </div>
      ) : (
        <div className="kpi-grid">
          <StatTile label="確認待ちの下書き" value={`${counts.drafted}`} tone="accent" />
          <StatTile
            label={canSend ? '送信できる案件' : '要対応'}
            value={`${counts.escalated}`}
            tone="urgent"
          />
          <StatTile label="未対応" value={`${counts.pending}`} />
          <StatTile label="担当案件 合計" value={`${counts.all}`} />
        </div>
      )}

      <div className="dash-grid">
        <SectionCard
          title={isManager ? '事務所の対応キュー' : 'あなたの対応待ち'}
          action={
            <Link href="/inbox" className="dash-link">
              すべて表示 →
            </Link>
          }
        >
          {queue.length === 0 ? (
            <EmptyRow>対応待ちの案件はありません。</EmptyRow>
          ) : (
            queue.map((t) => (
              <Link key={t.id} href={`/inbox/${t.id}`} className="dash-queue-row">
                <CategoryStripe category={catId(t.analysis)} />
                <span className="dash-queue-main">
                  <span className="dash-queue-subject">
                    {isUrgent(t.analysis) && <span className="dash-urgent-dot" aria-hidden />}
                    {t.subject || '(件名なし)'}
                  </span>
                  <span className="dash-queue-client">
                    {t.client?.name ?? t.unmatchedSender ?? '(未登録)'}
                  </span>
                </span>
                <StatusChip status={t.status} />
                <span className="dash-queue-time">{shortTime(t.receivedAt)}</span>
              </Link>
            ))
          )}
        </SectionCard>

        <div className="dash-side">
          <SectionCard title="クイックアクション">
            <nav className="dash-quick">
              <QuickLink href="/clients" icon="user" label="顧問先" sub="担当先の確認・管理" />
              <QuickLink href="/knowledge" icon="book" label="ナレッジ" sub="事務所の回答資産" />
              {isManager && (
                <QuickLink
                  href="/analytics"
                  icon="chart"
                  label="パフォーマンス"
                  sub="KPI・エスカレーション率"
                />
              )}
              {ctxCan(ctx, 'member.manage') && (
                <QuickLink
                  href="/settings"
                  icon="settings"
                  label="設定・メンバー"
                  sub="連携・チーム・権限"
                />
              )}
            </nav>
          </SectionCard>
          {ctxCan(ctx, 'member.manage') && <SetupChecklist />}
        </div>
      </div>
    </div>
  );
}

function FlowStep({
  n,
  icon,
  title,
  sub,
}: {
  n: number;
  icon: IconName;
  title: string;
  sub: string;
}) {
  return (
    <li className="dash-flow-step">
      <span className="dash-flow-glyph">
        <Icon name={icon} size={16} />
        <span className="dash-flow-n">{n}</span>
      </span>
      <span className="dash-flow-title">{title}</span>
      <span className="dash-flow-sub">{sub}</span>
    </li>
  );
}

function QuickLink({
  href,
  icon,
  label,
  sub,
}: {
  href: string;
  icon: IconName;
  label: string;
  sub: string;
}) {
  return (
    <Link href={href} className="dash-quick-row">
      <span className="dash-quick-glyph">
        <Icon name={icon} size={15} />
      </span>
      <span className="dash-quick-text">
        <span className="dash-quick-label">{label}</span>
        <span className="dash-quick-sub">{sub}</span>
      </span>
      <Icon name="chevron-right" size={13} />
    </Link>
  );
}
