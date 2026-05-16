'use client';

import { useState } from 'react';
import { Icon } from '@/components/ui/icon';

type Tab = 'chat' | 'sources' | 'client' | 'status';

export function SidecarPlaceholder() {
  const [tab, setTab] = useState<Tab>('chat');
  const tabs: Array<{ id: Tab; label: string }> = [
    { id: 'chat', label: 'Chat' },
    { id: 'sources', label: 'Sources' },
    { id: 'client', label: 'Client' },
    { id: 'status', label: 'Status' },
  ];
  return (
    <aside className="sidecar">
      <header className="sidecar-head">
        <span className="sidecar-title">AI コンテキスト</span>
        <span className="lifecycle-chip" data-state="open">
          <span className="lifecycle-dot" />
          対応中
        </span>
      </header>
      <div className="sc-tabs">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            className={`sc-tab ${tab === t.id ? 'active' : ''}`}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div className="sc-pane sc-pane-stub">
        <div className="sc-block sc-block-placeholder">
          <div className="sc-block-head">
            <span>{tabs.find((t) => t.id === tab)?.label}</span>
          </div>
          <p className="placeholder-text">
            <Icon name="spark" size={11} /> このタブは構築中です — 次のスライスで実装します。
          </p>
        </div>
      </div>
    </aside>
  );
}
