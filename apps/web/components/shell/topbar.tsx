import { type AppRole, roleLabel } from '@zeiro/core';
import Link from 'next/link';
import { Icon } from '@/components/ui/icon';
import { Logo } from '@/components/ui/logo';
import { NotificationBell } from './notification-bell';
import { Tabs } from './tabs';
import { UserMenu } from './user-menu';

export function Topbar({
  inboxCount,
  attentionCount,
  role,
  canViewAudit,
  canViewAnalytics,
}: {
  inboxCount: number;
  attentionCount: number;
  role: AppRole;
  canViewAudit: boolean;
  canViewAnalytics: boolean;
}) {
  return (
    <header className="topbar">
      <Link href="/home" className="brand">
        <Logo size={22} wordmarkClassName="text-[15px]" />
        <span className="brand-tag">tax-office agent</span>
      </Link>
      <Tabs
        inboxCount={inboxCount}
        canViewAudit={canViewAudit}
        canViewAnalytics={canViewAnalytics}
      />
      <div className="user-cluster">
        <span className={`role-chip role-${role}`} title="あなたの役割">
          {roleLabel(role)}
        </span>
        <Link href="/inbox" className="icon-btn" aria-label="検索">
          <Icon name="search" size={15} />
        </Link>
        <NotificationBell count={attentionCount} />
        <Link href="/settings" className="icon-btn" aria-label="設定">
          <Icon name="settings" size={15} />
        </Link>
        <div style={{ width: 1, height: 20, background: 'var(--line)' }} />
        <UserMenu />
      </div>
    </header>
  );
}
