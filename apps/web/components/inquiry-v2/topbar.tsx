import Link from 'next/link';
import { Icon } from '@/components/ui/icon';

type Props = {
  unreadCount: number;
  activeTab: 'inbox' | 'clients' | 'knowledge' | 'analytics' | 'settings';
  userInitials: string;
};

export function TopbarV2({ unreadCount, activeTab, userInitials }: Props) {
  const tabs = [
    { id: 'inbox', label: '受信トレイ', href: '/inbox', count: unreadCount },
    { id: 'clients', label: '顧問先', href: '/clients' },
    { id: 'knowledge', label: 'ナレッジ', href: '/knowledge' },
    { id: 'analytics', label: 'パフォーマンス', href: '/analytics' },
    { id: 'settings', label: '設定', href: '/settings' },
  ] as const;

  return (
    <header className="topbar">
      <div className="brand">
        <div className="brand-mark">z</div>
        zeiro
        <span className="brand-tag">tax-office agent</span>
      </div>
      <nav className="tabs">
        {tabs.map((t) => (
          <Link
            key={t.id}
            href={t.href}
            className={`tab ${activeTab === t.id ? 'active' : ''}`}
          >
            {t.label}
            {'count' in t && t.count !== undefined && t.count > 0 && (
              <span className="tab-count">{t.count}</span>
            )}
          </Link>
        ))}
      </nav>
      <div className="user-cluster">
        <button type="button" className="icon-btn"><Icon name="search" size={15} /></button>
        <button type="button" className="icon-btn">
          <Icon name="bell" size={15} />
          <span className="dot" />
        </button>
        <Link href="/settings" className="icon-btn"><Icon name="settings" size={15} /></Link>
        <div style={{ width: 1, height: 20, background: 'var(--line)' }} />
        <div className="avatar">{userInitials}</div>
      </div>
    </header>
  );
}
