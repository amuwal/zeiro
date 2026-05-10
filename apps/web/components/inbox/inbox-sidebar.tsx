'use client';

import { CATEGORY_THEME } from '@zeiro/core';
import type { InboxCounts } from '@zeiro/db';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Icon, type IconName } from '@/components/ui/icon';
import { EscalationCard } from './escalation-card';

type Folder = { id: string; label: string; icon: IconName; count: number };

type Props = {
  counts: InboxCounts;
  currentUser: { id: string; name: string };
  myCount: number;
};

export function InboxSidebar({ counts, currentUser, myCount }: Props) {
  const params = useSearchParams();
  const filter = params.get('filter') ?? 'all';
  const category = params.get('category') ?? 'all';
  const assignee = params.get('assignee') ?? 'me';

  const folders: Folder[] = [
    { id: 'all', label: '受信トレイ', icon: 'inbox', count: counts.all },
    { id: 'pending', label: '未対応', icon: 'alert', count: counts.pending },
    { id: 'drafted', label: '下書き済', icon: 'edit', count: counts.drafted },
    { id: 'escalated', label: '要レビュー', icon: 'flag', count: counts.escalated },
    { id: 'sent', label: '送信済', icon: 'check', count: counts.sent },
  ];

  return (
    <aside className="sidebar">
      <div className="side-section">
        <div className="side-label">フォルダ</div>
        {folders.map((f) => (
          <Link
            key={f.id}
            href={hrefFor({ filter: f.id, category, assignee })}
            className={`side-item ${filter === f.id ? 'active' : ''}`}
          >
            <span className="glyph">
              <Icon name={f.icon} size={14} />
            </span>
            <span>{f.label}</span>
            <span className="count">{f.count}</span>
          </Link>
        ))}
      </div>

      <div className="side-section">
        <div className="side-label">カテゴリ</div>
        <Link
          href={hrefFor({ filter, category: 'all', assignee })}
          className={`side-item ${category === 'all' ? 'active' : ''}`}
        >
          <span className="glyph">
            <Icon name="filter" size={13} />
          </span>
          <span>すべて</span>
        </Link>
        {Object.values(CATEGORY_THEME).map((c) => (
          <Link
            key={c.jp}
            href={hrefFor({ filter, category: c.jp, assignee })}
            className={`side-item ${category === c.jp ? 'active' : ''}`}
          >
            <span className="swatch" style={{ background: c.color }} />
            <span>{c.jp}</span>
          </Link>
        ))}
      </div>

      <div className="side-section">
        <div className="side-label">担当</div>
        <Link
          href={hrefFor({ filter, category, assignee: 'me' })}
          className={`side-item ${assignee === 'me' ? 'active' : ''}`}
        >
          <span className="glyph">
            <Icon name="user" size={13} />
          </span>
          <span>{currentUser.name}</span>
          <span className="count">{myCount}</span>
        </Link>
        <Link
          href={hrefFor({ filter, category, assignee: 'all' })}
          className={`side-item ${assignee === 'all' ? 'active' : ''}`}
        >
          <span className="glyph">
            <Icon name="users" size={13} />
          </span>
          <span>所内全員</span>
          <span className="count">{counts.all}</span>
        </Link>
      </div>

      <EscalationCard counts={counts} />
    </aside>
  );
}

function hrefFor(params: { filter: string; category: string; assignee: string }): string {
  const search = new URLSearchParams();
  if (params.filter !== 'all') search.set('filter', params.filter);
  if (params.category !== 'all') search.set('category', params.category);
  if (params.assignee !== 'me') search.set('assignee', params.assignee);
  return search.toString() ? `/inbox?${search}` : '/inbox';
}
