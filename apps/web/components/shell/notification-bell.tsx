'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { Icon } from '@/components/ui/icon';
import { type AttentionItem, listAttentionItems } from './notification-actions';

const STATUS_LABEL: Record<string, string> = {
  escalated: '要レビュー',
  unmatched: '送信元不明',
  pending: '未処理',
};

export function NotificationBell({ count }: { count: number }) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<AttentionItem[] | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open || items !== null) return;
    listAttentionItems()
      .then(setItems)
      .catch(() => setItems([]));
  }, [open, items]);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div ref={wrapRef} className="notif">
      <button
        type="button"
        className="icon-btn"
        aria-label="通知"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <Icon name="bell" size={15} />
        {count > 0 && <span className="notif-dot" />}
      </button>
      {open && (
        <div role="menu" className="notif-panel">
          <div className="notif-head">対応が必要な案件 {count > 0 ? `· ${count}件` : ''}</div>
          {items === null && <div className="notif-empty">読み込み中…</div>}
          {items !== null && items.length === 0 && (
            <div className="notif-empty">対応が必要な案件はありません。</div>
          )}
          {items?.map((it) => (
            <Link
              key={it.id}
              href={`/inbox/${it.id}`}
              className="notif-row"
              onClick={() => setOpen(false)}
            >
              <span className={`notif-tag notif-${it.status}`}>{STATUS_LABEL[it.status]}</span>
              <span className="notif-row-main">
                <span className="notif-subject">{it.subject}</span>
                <span className="notif-client">{it.client}</span>
              </span>
            </Link>
          ))}
          {items && items.length > 0 && (
            <Link href="/inbox" className="notif-foot" onClick={() => setOpen(false)}>
              受信トレイで全て見る →
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
