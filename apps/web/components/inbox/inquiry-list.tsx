'use client';

import type { InquiryThreadRow as InquiryRowData } from '@zeiro/db';
import { usePathname, useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Icon } from '@/components/ui/icon';
import { readCategory } from '@/lib/inquiry-derived';
import { InquiryRow } from './inquiry-row';

const FILTER_TO_STATUS: Record<string, string | null> = {
  all: null,
  pending: 'pending',
  drafted: 'drafted',
  escalated: 'escalated',
  sent: 'sent',
  unmatched: 'unmatched',
};

type Props = { items: InquiryRowData[]; currentUserId: string };

export function InquiryList({ items, currentUserId }: Props) {
  const params = useSearchParams();
  const pathname = usePathname();
  const filter = params.get('filter') ?? 'all';
  const category = params.get('category') ?? 'all';
  const assignee = params.get('assignee') ?? 'me';
  const selectedId = pathname.startsWith('/inbox/') ? pathname.split('/')[2] : null;

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
    const wantedStatus = FILTER_TO_STATUS[filter] ?? null;
    const needle = query.trim().toLowerCase();
    return items.filter((inq) => {
      if (wantedStatus && inq.status !== wantedStatus) return false;
      if (!wantedStatus && inq.status === 'unmatched') return false;
      if (category !== 'all' && readCategory(inq) !== category) return false;
      if (assignee === 'me' && filter !== 'unmatched' && inq.assignedToId !== currentUserId)
        return false;
      if (needle && !matchesQuery(inq, needle)) return false;
      return true;
    });
  }, [items, filter, category, assignee, currentUserId, query]);

  return (
    <div className="inbox-col">
      <div className="inbox-head">
        <div className="inbox-title">受信トレイ</div>
        <div className="inbox-meta">
          {filtered.length} / {items.length}
        </div>
      </div>
      <div className="inbox-search">
        <Icon name="search" size={14} />
        <input
          ref={inputRef}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="顧問先・件名・本文を検索…"
        />
        <kbd>⌘K</kbd>
      </div>
      <div className="inbox-list anim-stagger" key={`${filter}-${category}-${assignee}`}>
        {filtered.map((inq) => (
          <InquiryRow
            key={inq.id}
            inquiry={inq}
            selected={inq.id === selectedId}
            query={params.toString()}
          />
        ))}
        {filtered.length === 0 && (
          <div className="empty">
            <div>
              <div className="ico">
                <Icon name="inbox" size={16} />
              </div>
              該当する問い合わせはありません
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function matchesQuery(inq: InquiryRowData, needle: string): boolean {
  return (
    inq.subject.toLowerCase().includes(needle) ||
    inq.body.toLowerCase().includes(needle) ||
    (inq.client?.name.toLowerCase().includes(needle) ?? false) ||
    (inq.client?.primaryEmail.toLowerCase().includes(needle) ?? false) ||
    (inq.unmatchedSender?.toLowerCase().includes(needle) ?? false)
  );
}
