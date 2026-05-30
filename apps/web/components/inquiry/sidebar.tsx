'use client';

import { useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Icon } from '@/components/ui/icon';
import type { InboxItemView } from './inbox-list';

type Props = {
  items: InboxItemView[];
  filter: string;
  channel: string;
  lifecycle: string;
  category: string;
  setFilter: (v: string) => void;
  setChannel: (v: string) => void;
  setLifecycle: (v: string) => void;
  setCategory: (v: string) => void;
};

function SidePillList({ activeKey, children }: { activeKey: string; children: React.ReactNode }) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [pill, setPill] = useState<{ top: number; height: number } | null>(null);
  useLayoutEffect(() => {
    if (!wrapRef.current) return;
    const el = wrapRef.current.querySelector<HTMLElement>(`[data-key="${CSS.escape(activeKey)}"]`);
    if (!el) {
      setPill(null);
      return;
    }
    setPill({ top: el.offsetTop, height: el.offsetHeight });
  }, [activeKey]);
  return (
    <div className="side-list" ref={wrapRef}>
      {pill && (
        <span
          className="side-pill"
          style={{ transform: `translateY(${pill.top}px)`, height: pill.height }}
        />
      )}
      {children}
    </div>
  );
}

export function Sidebar({
  items,
  filter,
  channel,
  lifecycle,
  category,
  setFilter,
  setChannel,
  setLifecycle,
  setCategory,
}: Props) {
  const counts = useMemo(
    () => ({
      all: items.length,
      unread: items.filter((i) => i.unread).length,
      draft: items.filter((i) => i.status === 'drafted').length,
      escalated: items.filter((i) => i.status === 'escalated').length,
      sent: items.filter((i) => i.status === 'sent').length,
      byChannel: items.reduce(
        (acc, i) => {
          acc[i.channel] = (acc[i.channel] ?? 0) + 1;
          return acc;
        },
        {} as Record<'email' | 'form' | 'line' | 'chatwork', number>,
      ),
    }),
    [items],
  );
  const escalationRate = counts.all === 0 ? 0 : Math.round((counts.escalated / counts.all) * 100);

  const folders = [
    { id: 'all', label: '受信トレイ', icon: 'inbox' as const, count: counts.all },
    { id: 'unread', label: '未読', icon: 'alert' as const, count: counts.unread },
    { id: 'draft', label: '下書き済', icon: 'edit' as const, count: counts.draft },
    { id: 'escalated', label: '要レビュー', icon: 'flag' as const, count: counts.escalated },
    { id: 'sent', label: '送信済', icon: 'check' as const, count: counts.sent },
  ];
  const channels = [
    { id: 'all', label: 'すべてのチャンネル', glyph: '✶' },
    { id: 'email', label: 'メール', glyph: 'M', count: counts.byChannel.email ?? 0 },
    { id: 'form', label: 'Webフォーム', glyph: 'F', count: counts.byChannel.form ?? 0 },
    { id: 'line', label: 'LINE', glyph: 'L', count: counts.byChannel.line ?? 0 },
  ];
  const lifecycles = [
    { id: 'all', label: 'すべての状態' },
    { id: 'open', label: '対応中' },
    { id: 'resolved', label: '完了' },
  ];
  const categories = [
    { id: 'all', label: 'すべて' },
    { id: 'deadline', label: '期日確認' },
    { id: 'docs', label: '書類提出' },
    { id: 'tax', label: '税務質問' },
    { id: 'contract', label: '顧問契約' },
    { id: 'other', label: 'その他' },
  ];

  return (
    <aside className="sidebar">
      <div className="side-section">
        <div className="side-label">FOLDERS</div>
        <SidePillList activeKey={filter}>
          {folders.map((it) => (
            <button
              type="button"
              key={it.id}
              data-key={it.id}
              onClick={() => setFilter(it.id)}
              className={`side-item ${filter === it.id ? 'active' : ''}`}
            >
              <span className="glyph">
                <Icon name={it.icon} size={14} />
              </span>
              <span>{it.label}</span>
              <span className="count">{it.count}</span>
            </button>
          ))}
        </SidePillList>
      </div>

      <div className="side-section">
        <div className="side-label">CHANNELS</div>
        <SidePillList activeKey={channel}>
          {channels.map((c) => (
            <button
              type="button"
              key={c.id}
              data-key={c.id}
              onClick={() => setChannel(c.id)}
              className={`side-item ${channel === c.id ? 'active' : ''}`}
            >
              <span className="glyph ch-side">{c.glyph}</span>
              <span>{c.label}</span>
              {c.count !== undefined && c.count > 0 && <span className="count">{c.count}</span>}
            </button>
          ))}
        </SidePillList>
      </div>

      <div className="side-section">
        <div className="side-label">LIFECYCLE</div>
        <SidePillList activeKey={lifecycle}>
          {lifecycles.map((l) => (
            <button
              type="button"
              key={l.id}
              data-key={l.id}
              onClick={() => setLifecycle(l.id)}
              className={`side-item ${lifecycle === l.id ? 'active' : ''}`}
            >
              <span className="glyph">
                <span
                  className={`lifecycle-dot small ${l.id !== 'all' ? 'filled' : ''}`}
                  data-state={l.id}
                />
              </span>
              <span>{l.label}</span>
            </button>
          ))}
        </SidePillList>
      </div>

      <div className="side-section">
        <div className="side-label">CATEGORIES</div>
        <SidePillList activeKey={category}>
          {categories.map((c) => (
            <button
              type="button"
              key={c.id}
              data-key={c.id}
              onClick={() => setCategory(c.id)}
              className={`side-item ${category === c.id ? 'active' : ''}`}
            >
              <span className="swatch" />
              <span>{c.label}</span>
            </button>
          ))}
        </SidePillList>
      </div>

      <div className="side-foot">
        <div className="side-foot-head">
          <span>エスカレーション率</span>
          <span>目標 32%</span>
        </div>
        <div className="side-foot-rate">
          {escalationRate}
          <span className="pct">%</span>
        </div>
        <div className="side-foot-bar">
          <i style={{ width: `${escalationRate}%` }} />
          <span className="target" style={{ left: '32%' }} />
        </div>
        <div className="side-foot-meta">
          <span>
            {counts.escalated} / {counts.all} 件
          </span>
          <span>{escalationRate <= 37 ? '適正範囲' : '要調整'}</span>
        </div>
      </div>
    </aside>
  );
}
