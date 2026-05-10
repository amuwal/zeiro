'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useTransition } from 'react';
import type { AnalyticsWindow } from '@/lib/analytics-window';
import { AUDIT_ACTION_DISPLAY } from '@/lib/audit-display';

const ALL = 'all';

const ACTIONS = Object.entries(AUDIT_ACTION_DISPLAY).map(([value, meta]) => ({
  value,
  label: meta.jp,
}));

const WINDOWS: { value: AnalyticsWindow; label: string }[] = [
  { value: 'today', label: '今日' },
  { value: '7d', label: '7日' },
  { value: '30d', label: '30日' },
  { value: 'quarter', label: '四半期' },
];

type Props = {
  users: { id: string; name: string }[];
  active: {
    action: string | undefined;
    actor: string | undefined;
    window: AnalyticsWindow;
  };
};

export function AuditFilters({ users, active }: Props) {
  const router = useRouter();
  const params = useSearchParams();
  const [pending, startTransition] = useTransition();

  function update(key: 'action' | 'actor' | 'window', value: string) {
    const next = new URLSearchParams(params.toString());
    next.delete('cursor');
    if (value === ALL || (key === 'window' && value === '30d')) next.delete(key);
    else next.set(key, value);
    const qs = next.toString();
    startTransition(() => {
      router.push(qs ? `/audit?${qs}` : '/audit');
    });
  }

  return (
    <div className="audit-filters">
      <label className="audit-filter">
        <span className="audit-filter-label">アクション</span>
        <select
          value={active.action ?? ALL}
          onChange={(e) => update('action', e.target.value)}
          disabled={pending}
        >
          <option value={ALL}>すべて</option>
          {ACTIONS.map((a) => (
            <option key={a.value} value={a.value}>
              {a.label}
            </option>
          ))}
        </select>
      </label>

      <label className="audit-filter">
        <span className="audit-filter-label">実行者</span>
        <select
          value={active.actor ?? ALL}
          onChange={(e) => update('actor', e.target.value)}
          disabled={pending}
        >
          <option value={ALL}>すべて</option>
          {users.map((u) => (
            <option key={u.id} value={u.id}>
              {u.name}
            </option>
          ))}
        </select>
      </label>

      <label className="audit-filter">
        <span className="audit-filter-label">期間</span>
        <select
          value={active.window}
          onChange={(e) => update('window', e.target.value)}
          disabled={pending}
        >
          {WINDOWS.map((w) => (
            <option key={w.value} value={w.value}>
              {w.label}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}
