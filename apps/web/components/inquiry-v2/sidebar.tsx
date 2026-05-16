'use client';

import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Icon } from '@/components/ui/icon';

type Counts = {
  all: number;
  unread: number;
  draft: number;
  escalated: number;
  sent: number;
  byChannel: Partial<Record<'email' | 'form' | 'line', number>>;
};

type Props = {
  counts: Counts;
  escalationRate: number;
  filter: string;
  channel: string;
  lifecycle: string;
  category: string;
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

export function SidebarV2({ counts, escalationRate, filter, channel, lifecycle, category }: Props) {
  const folders = [
    { id: 'all', label: '受信トレイ', icon: 'inbox' as const, count: counts.all },
    { id: 'unread', label: '未対応', icon: 'alert' as const, count: counts.unread },
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
    { id: 'awaiting_client', label: '返信待ち' },
    { id: 'snoozed', label: '保留' },
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
            <a
              key={it.id}
              data-key={it.id}
              href={filterHref({ filter: it.id, channel, lifecycle, category })}
              className={`side-item ${filter === it.id ? 'active' : ''}`}
            >
              <span className="glyph"><Icon name={it.icon} size={14} /></span>
              <span>{it.label}</span>
              <span className="count">{it.count}</span>
            </a>
          ))}
        </SidePillList>
      </div>

      <div className="side-section">
        <div className="side-label">CHANNELS</div>
        <SidePillList activeKey={channel}>
          {channels.map((c) => (
            <a
              key={c.id}
              data-key={c.id}
              href={filterHref({ filter, channel: c.id, lifecycle, category })}
              className={`side-item ${channel === c.id ? 'active' : ''}`}
            >
              <span className="glyph ch-side">{c.glyph}</span>
              <span>{c.label}</span>
              {c.count !== undefined && c.count > 0 && <span className="count">{c.count}</span>}
            </a>
          ))}
        </SidePillList>
      </div>

      <div className="side-section">
        <div className="side-label">LIFECYCLE</div>
        <SidePillList activeKey={lifecycle}>
          {lifecycles.map((l) => (
            <a
              key={l.id}
              data-key={l.id}
              href={filterHref({ filter, channel, lifecycle: l.id, category })}
              className={`side-item ${lifecycle === l.id ? 'active' : ''}`}
            >
              <span className="glyph">
                <span
                  className={`lifecycle-dot small ${l.id !== 'all' ? 'filled' : ''}`}
                  data-state={l.id}
                />
              </span>
              <span>{l.label}</span>
            </a>
          ))}
        </SidePillList>
      </div>

      <div className="side-section">
        <div className="side-label">CATEGORIES</div>
        <SidePillList activeKey={category}>
          {categories.map((c) => (
            <a
              key={c.id}
              data-key={c.id}
              href={filterHref({ filter, channel, lifecycle, category: c.id })}
              className={`side-item ${category === c.id ? 'active' : ''}`}
            >
              <span className="swatch" />
              <span>{c.label}</span>
            </a>
          ))}
        </SidePillList>
      </div>

      <div className="side-foot">
        <div className="side-foot-head">
          <span>ESCALATION TODAY</span>
          <span>↗ 32% target</span>
        </div>
        <div className="side-foot-rate">
          {escalationRate}<span className="pct">%</span>
        </div>
        <div className="side-foot-bar">
          <i style={{ width: `${escalationRate}%` }} />
          <span className="target" style={{ left: '32%' }} />
        </div>
        <div className="side-foot-meta">
          <span>{counts.escalated} of {counts.all}</span>
          <span>{escalationRate <= 37 ? 'WITHIN RANGE' : 'RECALIBRATE'}</span>
        </div>
      </div>
    </aside>
  );
}

function filterHref(p: { filter: string; channel: string; lifecycle: string; category: string }): string {
  const q = new URLSearchParams();
  if (p.filter !== 'all') q.set('filter', p.filter);
  if (p.channel !== 'all') q.set('channel', p.channel);
  if (p.lifecycle !== 'all') q.set('lifecycle', p.lifecycle);
  if (p.category !== 'all') q.set('category', p.category);
  const s = q.toString();
  return s ? `?${s}` : '?';
}
