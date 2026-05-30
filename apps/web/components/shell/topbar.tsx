import { type AppRole, roleLabel } from '@zeiro/core';
import Link from 'next/link';
import { Icon } from '@/components/ui/icon';
import { Tabs } from './tabs';
import { UserMenu } from './user-menu';

export function Topbar({
  inboxCount,
  role,
  canViewAudit,
  canViewAnalytics,
}: {
  inboxCount: number;
  role: AppRole;
  canViewAudit: boolean;
  canViewAnalytics: boolean;
}) {
  return (
    <header className="topbar">
      <div className="brand">
        <div className="brand-mark">z</div>
        zeiro
        <span className="brand-tag">tax-office agent</span>
      </div>
      <Tabs
        inboxCount={inboxCount}
        canViewAudit={canViewAudit}
        canViewAnalytics={canViewAnalytics}
      />
      <div className="user-cluster">
        <span className={`role-chip role-${role}`} title="あなたの役割">
          {roleLabel(role)}
        </span>
        <button type="button" className="icon-btn" aria-label="検索">
          <Icon name="search" size={15} />
        </button>
        <button type="button" className="icon-btn" aria-label="通知">
          <Icon name="bell" size={15} />
          <span className="dot" />
        </button>
        <Link href="/settings" className="icon-btn" aria-label="設定">
          <Icon name="settings" size={15} />
        </Link>
        <div style={{ width: 1, height: 20, background: 'var(--line)' }} />
        <UserMenu />
      </div>
    </header>
  );
}
