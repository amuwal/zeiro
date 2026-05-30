import Link from 'next/link';
import type { ReactNode } from 'react';

export function StatTile({
  label,
  value,
  sub,
  tone = 'default',
}: {
  label: string;
  value: string;
  sub?: string;
  tone?: 'default' | 'accent' | 'urgent' | 'positive';
}) {
  const valueColor =
    tone === 'urgent'
      ? 'text-urgent'
      : tone === 'positive'
        ? 'text-positive'
        : tone === 'accent'
          ? 'text-accent'
          : 'text-ink';
  return (
    <div className="rounded-md border border-line bg-surface px-4 py-3.5 shadow-sm">
      <div className="text-[11px] font-medium tracking-wide text-muted">{label}</div>
      <div className={`mt-1 font-sans text-[26px] font-semibold leading-none ${valueColor}`}>
        {value}
      </div>
      {sub && <div className="mt-1.5 text-[11px] text-muted-2">{sub}</div>}
    </div>
  );
}

export function SectionCard({
  title,
  action,
  children,
}: {
  title: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="rounded-lg border border-line bg-surface shadow-sm">
      <header className="flex items-center justify-between border-b border-line px-4 py-3">
        <h2 className="font-sans text-[13px] font-semibold text-ink">{title}</h2>
        {action}
      </header>
      <div>{children}</div>
    </section>
  );
}

type StatusMeta = { label: string; tone: string };
const STATUS_FALLBACK: StatusMeta = { label: '未対応', tone: 'text-muted' };
const STATUS_META: Record<string, StatusMeta> = {
  pending: STATUS_FALLBACK,
  drafted: { label: '確認待ち', tone: 'text-accent' },
  escalated: { label: '要対応', tone: 'text-urgent' },
  unmatched: { label: '送信元不明', tone: 'text-urgent' },
  sent: { label: '送信済', tone: 'text-positive' },
  rejected: { label: '却下', tone: 'text-muted-2' },
};

export function QueueRow({
  href,
  company,
  subject,
  status,
  urgent,
  received,
}: {
  href: string;
  company: string;
  subject: string;
  status: string;
  urgent: boolean;
  received: string;
}) {
  const meta = STATUS_META[status] ?? STATUS_FALLBACK;
  return (
    <Link
      href={href}
      className="flex items-center gap-3 border-b border-line px-4 py-2.5 transition-colors last:border-b-0 hover:bg-bg-2"
    >
      {urgent ? (
        <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-urgent" aria-hidden />
      ) : (
        <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-line-strong" aria-hidden />
      )}
      <div className="min-w-0 flex-1">
        <div className="truncate text-[13px] font-medium text-ink">{subject || '(件名なし)'}</div>
        <div className="truncate text-[11px] text-muted">{company}</div>
      </div>
      <span className={`shrink-0 text-[11px] font-medium ${meta.tone}`}>{meta.label}</span>
      <span className="w-12 shrink-0 text-right font-mono text-[10px] text-muted-2">
        {received}
      </span>
    </Link>
  );
}

export function EmptyRow({ children }: { children: ReactNode }) {
  return <div className="px-4 py-8 text-center text-[12px] text-muted-2">{children}</div>;
}
