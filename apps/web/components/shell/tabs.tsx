'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

type Tab = {
  href: string;
  label: string;
  count?: number;
};

export function Tabs({ inboxCount, admin }: { inboxCount: number; admin: boolean }) {
  const pathname = usePathname();
  const tabs: Tab[] = [
    { href: '/inbox', label: '受信トレイ', count: inboxCount },
    { href: '/knowledge', label: 'ナレッジ' },
    { href: '/analytics', label: 'パフォーマンス' },
    ...(admin ? [{ href: '/audit', label: '監査ログ' } as Tab] : []),
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
