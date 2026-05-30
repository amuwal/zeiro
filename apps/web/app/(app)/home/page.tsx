import { roleLabel } from '@zeiro/core';
import { getInboxCounts, getUser, listInquiryThreads } from '@zeiro/db';
import Link from 'next/link';
import { EmptyRow, QueueRow, SectionCard, StatTile } from '@/components/dashboard/dashboard-parts';
import { SetupChecklist } from '@/components/onboarding/setup-checklist';
import { Icon, type IconName } from '@/components/ui/icon';
import { getWindowAnalytics, TARGET_ESCALATION_PCT } from '@/lib/analytics';
import { resolveWindow } from '@/lib/analytics-window';
import { ctxCan, viewerScope } from '@/lib/authz';
import { requireFirmContext } from '@/lib/firm-context';
import { shortTime } from '@/lib/inquiry-mappers';

const ACTIONABLE = new Set(['pending', 'drafted', 'escalated', 'unmatched']);
const PRIORITY: Record<string, number> = { escalated: 0, unmatched: 0, drafted: 1, pending: 2 };

function isUrgent(analysis: unknown): boolean {
  const a = (analysis ?? {}) as Record<string, unknown>;
  const triage = (a.triage ?? {}) as Record<string, unknown>;
  return triage.urgency === 'high' || a.urgency === 'high';
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
  const kpis = isManager ? await getWindowAnalytics(ctx.firmId, resolveWindow('7d')) : null;

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
  const queueTitle = isManager ? '事務所の対応キュー' : 'あなたの対応待ち';

  return (
    <div className="kb-pane anim-stagger">
      <div className="mx-auto flex max-w-[1080px] flex-col gap-6">
        <header className="flex items-end justify-between">
          <div>
            <h1 className="font-sans text-[22px] font-semibold tracking-tight text-ink">
              {me?.name ? `${me.name} さん` : 'ホーム'}
              <span className="ml-2 align-middle text-[12px] font-medium text-muted">
                {roleLabel(ctx.role)}
              </span>
            </h1>
            <p className="mt-0.5 text-[13px] text-muted">
              {needsAction > 0
                ? `対応が必要な案件が ${needsAction} 件あります。`
                : '対応待ちの案件はありません。お疲れさまです。'}
            </p>
          </div>
          <Link href="/inbox" className="btn btn-primary">
            <Icon name="inbox" size={13} /> 受信トレイへ
          </Link>
        </header>

        {/* KPI / stat row */}
        {isManager && kpis ? (
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <StatTile
              label="受信 (7日)"
              value={`${kpis.current.total}`}
              sub={`メッセージ ${kpis.current.messages} 件`}
            />
            <StatTile
              label="エスカレーション率"
              value={`${Math.round(kpis.current.escalationRate * 100)}%`}
              sub={`目標 ${TARGET_ESCALATION_PCT}%`}
              tone={kpis.current.escalationRate > 0.45 ? 'urgent' : 'accent'}
            />
            <StatTile
              label="下書き採用率"
              value={`${Math.round(kpis.current.adoptionRate * 100)}%`}
              sub="編集なし送信"
              tone="positive"
            />
            <StatTile
              label="平均一次対応"
              value={
                kpis.current.avgResponseMinutes === null
                  ? '—'
                  : `${kpis.current.avgResponseMinutes.toFixed(1)}分`
              }
              sub="受信→下書き"
            />
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <StatTile label="確認待ちの下書き" value={`${counts.drafted}`} tone="accent" />
            <StatTile
              label={canSend ? '送信できる案件' : '要対応'}
              value={`${counts.escalated}`}
              tone="urgent"
            />
            <StatTile label="未対応" value={`${counts.pending}`} />
            <StatTile label="担当案件 合計" value={`${counts.all}`} tone="default" />
          </div>
        )}

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.6fr_1fr]">
          {/* Work queue */}
          <SectionCard
            title={queueTitle}
            action={
              <Link href="/inbox" className="text-[12px] font-medium text-accent hover:underline">
                すべて表示 →
              </Link>
            }
          >
            {queue.length === 0 ? (
              <EmptyRow>対応待ちの案件はありません。</EmptyRow>
            ) : (
              queue.map((t) => (
                <QueueRow
                  key={t.id}
                  href={`/inbox/${t.id}`}
                  company={t.client?.name ?? t.unmatchedSender ?? '(未登録)'}
                  subject={t.subject}
                  status={t.status}
                  urgent={isUrgent(t.analysis)}
                  received={shortTime(t.receivedAt)}
                />
              ))
            )}
          </SectionCard>

          {/* Quick links + owner setup checklist */}
          <div className="flex flex-col gap-6">
            <SectionCard title="クイックアクション">
              <nav className="flex flex-col">
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
    </div>
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
    <Link
      href={href}
      className="flex items-center gap-3 border-b border-line px-4 py-3 transition-colors last:border-b-0 hover:bg-bg-2"
    >
      <span className="grid h-8 w-8 place-items-center rounded-md bg-accent-soft text-accent">
        <Icon name={icon} size={15} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[13px] font-medium text-ink">{label}</span>
        <span className="block text-[11px] text-muted">{sub}</span>
      </span>
      <Icon name="chevron-right" size={13} />
    </Link>
  );
}
