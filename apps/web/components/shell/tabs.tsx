'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

type Tab = {
  href: string;
  label: string;
  count?: number;
};

export function Tabs({
  inboxCount,
  canViewAudit,
  canViewAnalytics,
}: {
  inboxCount: number;
  canViewAudit: boolean;
  canViewAnalytics: boolean;
}) {
  const pathname = usePathname();
  // Viewers don't get a home dashboard CTA distinct from the inbox; everyone
  // else lands on /home. The analytics tab is firm-wide KPIs (owner/reviewer);
  // staff see their personal stats on /home instead. Audit is owner-only.
  const tabs: Tab[] = [
    { href: '/home', label: 'ホーム' },
    { href: '/inbox', label: '受信トレイ', count: inboxCount },
    { href: '/clients', label: '顧問先' },
    { href: '/knowledge', label: 'ナレッジ' },
    ...(canViewAnalytics ? [{ href: '/analytics', label: 'パフォーマンス' } as Tab] : []),
    ...(canViewAudit ? [{ href: '/audit', label: '監査ログ' } as Tab] : []),
  ];
  return (
    <nav className="tabs">
      {tabs.map((t) => {
        const active = pathname === t.href || pathname.startsWith(`${t.href}/`);
        return (
          <Link key={t.href} href={t.href} className={`tab ${active ? 'active' : ''}`}>
            {t.label}
            {t.count !== undefined && <span className="tab-count">{t.count}</span>}
          </Link>
        );
      })}
    </nav>
  );
}
