'use client';

import type { ClientListRow } from '@zeiro/db';
import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Icon } from '@/components/ui/icon';
import { CONTRACT_LABELS } from './contract-labels';

type FilterKey = 'all' | 'monthly' | 'spot' | 'prospect' | 'unverified' | 'archived';

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: 'all', label: 'すべて' },
  { key: 'monthly', label: '顧問契約' },
  { key: 'spot', label: '単発' },
  { key: 'prospect', label: '見込み' },
  { key: 'unverified', label: '未確認' },
  { key: 'archived', label: 'アーカイブ' },
];

export function ClientList({ items }: { items: ClientListRow[] }) {
  const [filter, setFilter] = useState<FilterKey>('all');
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
        inputRef.current?.select();
      }
      if (e.key === 'Escape' && document.activeElement === inputRef.current) {
        setQuery('');
        inputRef.current?.blur();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return items.filter((c) => {
      const archived = c.archivedAt !== null;
      if (filter === 'archived') {
        if (!archived) return false;
      } else {
        if (archived) return false;
        if (filter !== 'all' && c.contractType !== filter) return false;
      }
      if (needle && !matches(c, needle)) return false;
      return true;
    });
  }, [items, filter, query]);

  return (
    <div className="cl-pane">
      <div className="cl-toolbar">
        <div className="cl-search">
          <Icon name="search" size={14} />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="名前・メールで検索…"
          />
          <kbd>⌘K</kbd>
        </div>
        <div className="cl-chips">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              type="button"
              onClick={() => setFilter(f.key)}
              className={`cl-chip ${filter === f.key ? 'active' : ''}`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <div className="kb-table">
        <div className="kb-row head cl-row-grid">
          <span>名前</span>
          <span>メール</span>
          <span>契約</span>
          <span>担当</span>
          <span>件数</span>
          <span>最終連絡</span>
          <span />
        </div>
        {filtered.map((c) => (
          <Link key={c.id} href={`/clients/${c.id}`} className="kb-row cl-row-grid cl-row-link">
            <div>
              <div className="doc-title">{c.name}</div>
              <div className="doc-sub">
                {c.lineUserId ? 'LINE 連携済 · ' : ''}
                {sourceLabel(c.source)}
              </div>
            </div>
            <span className="cl-email">{c.primaryEmail}</span>
            <span>
              <span className={`cl-pill ${c.contractType}`}>
                {CONTRACT_LABELS[c.contractType] ?? c.contractType}
              </span>
            </span>
            <span className="cl-assignee">{c.assignedToName ?? '—'}</span>
            <span className="uses">{c.inquiryCount}</span>
            <span className="updated">
              {c.lastContactAt ? new Date(c.lastContactAt).toLocaleDateString('ja-JP') : '—'}
            </span>
            <span className="cl-row-arrow">
              <Icon name="arrow-right" size={13} />
            </span>
          </Link>
        ))}
        {filtered.length === 0 && (
          <div className="cl-empty">
            <Icon name="user" size={16} />
            <span>該当する顧問先はありません</span>
          </div>
        )}
      </div>
    </div>
  );
}

function matches(c: ClientListRow, needle: string): boolean {
  return (
    c.name.toLowerCase().includes(needle) ||
    c.primaryEmail.toLowerCase().includes(needle) ||
    (c.notes?.toLowerCase().includes(needle) ?? false)
  );
}

function sourceLabel(source: string | null): string {
  if (!source) return '';
  const map: Record<string, string> = {
    manual: '手動登録',
    web_form: 'Webフォーム',
    email_promotion: 'メールから登録',
    line: 'LINE',
    seeded: 'シード',
    csv: 'CSV',
    api: 'API',
  };
  return map[source] ?? source;
}
