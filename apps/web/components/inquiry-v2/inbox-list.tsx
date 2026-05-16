'use client';

import Link from 'next/link';
import { useParams, useSearchParams } from 'next/navigation';
import { useMemo } from 'react';
import { Icon } from '@/components/ui/icon';

export type InboxItemView = {
  id: string;
  channel: 'email' | 'form' | 'line';
  company: string;
  subject: string;
  preview: string;
  received: string;
  urgent?: boolean;
  unread?: boolean;
  category: 'deadline' | 'docs' | 'tax' | 'contract' | 'other';
  confidence: number;
  lifecycle: 'open' | 'awaiting_client' | 'snoozed' | 'resolved';
  turnCount?: number;
};

const CHANNEL_GLYPH: Record<string, string> = { email: 'M', form: 'F', line: 'L' };
const CATEGORY_JP: Record<string, string> = {
  deadline: '期日確認',
  docs: '書類提出',
  tax: '税務質問',
  contract: '顧問契約',
  other: 'その他',
};
const LIFECYCLE_JP: Record<string, string> = {
  open: '対応中',
  awaiting_client: '返信待ち',
  snoozed: '保留',
  resolved: '完了',
};

function ConfidenceDots({ score }: { score: number }) {
  const filled = score >= 0.85 ? 4 : score >= 0.7 ? 3 : score >= 0.5 ? 2 : 1;
  const cls = score < 0.7 ? 'confidence low' : 'confidence';
  return (
    <span className={cls}>
      <span className="conf-dots">
        {[0, 1, 2, 3].map((i) => <i key={i} className={i < filled ? 'on' : ''} />)}
      </span>
      {Math.round(score * 100)}
    </span>
  );
}

function LifecycleChip({ state }: { state: string }) {
  return (
    <span className="lifecycle-chip" data-state={state}>
      <span className="lifecycle-dot" />
      {LIFECYCLE_JP[state] ?? state}
    </span>
  );
}

export function InboxListV2({ items }: { items: InboxItemView[] }) {
  const sp = useSearchParams();
  const params = useParams<{ inquiryId?: string }>();
  const selectedId = params.inquiryId ?? '';

  const filter = sp.get('filter') ?? 'all';
  const channel = sp.get('channel') ?? 'all';
  const lifecycle = sp.get('lifecycle') ?? 'all';
  const category = sp.get('category') ?? 'all';
  const queryString = sp.toString();
  const querySuffix = queryString ? `?${queryString}` : '';

  const filtered = useMemo(
    () =>
      items.filter((it) => {
        if (filter === 'unread' && !it.unread) return false;
        if (filter === 'draft' && it.unread) return false;
        if (filter === 'escalated' && it.confidence > 0.7) return false;
        if (filter === 'sent' && it.lifecycle !== 'resolved') return false;
        if (channel !== 'all' && it.channel !== channel) return false;
        if (lifecycle !== 'all' && it.lifecycle !== lifecycle) return false;
        if (category !== 'all' && it.category !== category) return false;
        return true;
      }),
    [items, filter, channel, lifecycle, category],
  );

  return (
    <div className="inbox-col">
      <div className="inbox-head">
        <div className="inbox-title">
          Inbox<span className="inbox-title-jp">受信トレイ</span>
        </div>
        <div className="inbox-meta">
          {String(filtered.length).padStart(2, '0')} / {String(items.length).padStart(2, '0')}
        </div>
      </div>
      <div className="inbox-search">
        <Icon name="search" size={14} />
        <input placeholder="顧問先・件名・本文を検索…" />
        <kbd>⌘K</kbd>
      </div>
      <div className="inbox-list">
        {filtered.map((inq, i) => (
          <Link
            key={inq.id}
            href={`/inbox-v2/${inq.id}${querySuffix}`}
            className={`inbox-item ${inq.id === selectedId ? 'selected' : ''} ${inq.unread ? 'unread' : ''}`}
            data-channel={inq.channel}
            data-cat={inq.category}
            style={{
              animation: `inbox-item-in 420ms cubic-bezier(0.32,0.72,0,1) ${i * 28}ms both`,
              display: 'block',
            }}
          >
            <div className="item-row1">
              <span className="channel-mark" title={inq.channel}>{CHANNEL_GLYPH[inq.channel]}</span>
              <span className="company">{inq.company}</span>
              {(inq.turnCount ?? 1) > 1 && <span className="turns-mark">{inq.turnCount}</span>}
              {inq.urgent && <span className="urgent-tag">URGENT</span>}
              <span className="time">{inq.received}</span>
            </div>
            <div className="item-subject">{inq.subject}</div>
            <div className="item-preview">{inq.preview}</div>
            <div className="item-row3">
              <span className="cat-pill" data-cat={inq.category}>
                <span className="swatch" />
                {CATEGORY_JP[inq.category] ?? inq.category}
              </span>
              <LifecycleChip state={inq.lifecycle} />
              <ConfidenceDots score={inq.confidence} />
            </div>
          </Link>
        ))}
        {filtered.length === 0 && <div className="empty">該当する問い合わせはありません</div>}
      </div>
    </div>
  );
}
