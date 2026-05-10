'use client';

import type { InquiryRow as InquiryRowData } from '@zeiro/db';
import { usePathname, useSearchParams } from 'next/navigation';
import { useMemo } from 'react';
import { Icon } from '@/components/ui/icon';
import { readCategory } from '@/lib/inquiry-derived';
import { InquiryRow } from './inquiry-row';

const FILTER_TO_STATUS: Record<string, string | null> = {
  all: null,
  pending: 'pending',
  drafted: 'drafted',
  escalated: 'escalated',
  sent: 'sent',
};

type Props = { items: InquiryRowData[]; currentUserId: string };

export function InquiryList({ items, currentUserId }: Props) {
  const params = useSearchParams();
  const pathname = usePathname();
  const filter = params.get('filter') ?? 'all';
  const category = params.get('category') ?? 'all';
  const assignee = params.get('assignee') ?? 'me';
  const selectedId = pathname.startsWith('/inbox/') ? pathname.split('/')[2] : null;

  const filtered = useMemo(() => {
    const wantedStatus = FILTER_TO_STATUS[filter] ?? null;
    return items.filter((inq) => {
      if (wantedStatus && inq.status !== wantedStatus) return false;
      if (category !== 'all' && readCategory(inq) !== category) return false;
      if (assignee === 'me' && inq.assignedToId !== currentUserId) return false;
      return true;
    });
  }, [items, filter, category, assignee, currentUserId]);

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
        <input placeholder="顧問先・件名・本文を検索…" />
        <kbd>⌘K</kbd>
      </div>
      <div className="inbox-list anim-stagger" key={`${filter}-${category}-${assignee}`}>
        {filtered.map((inq) => (
          <InquiryRow key={inq.id} inquiry={inq} selected={inq.id === selectedId} />
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
