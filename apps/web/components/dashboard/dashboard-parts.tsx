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

export function EmptyRow({ children }: { children: ReactNode }) {
  return <div className="px-4 py-8 text-center text-[12px] text-muted-2">{children}</div>;
}
