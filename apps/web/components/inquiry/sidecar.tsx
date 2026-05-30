'use client';

import { useState } from 'react';
import { ChatTab } from './sidecar-tabs/chat-tab';
import { ClientTab, type ClientTabData } from './sidecar-tabs/client-tab';
import { type SourceItem, SourcesTab } from './sidecar-tabs/sources-tab';
import { StatusTab, type StatusTabData } from './sidecar-tabs/status-tab';

type Tab = 'chat' | 'sources' | 'client' | 'status';

type Props = {
  inquiryId: string;
  inquiryStatus: string;
  lifecycleLabel: string;
  lifecycleState: 'open' | 'awaiting_client' | 'snoozed' | 'resolved';
  sources: SourceItem[];
  client: ClientTabData | null;
  status: StatusTabData;
};

export function Sidecar(props: Props) {
  // Land on the evidence (which firm knowledge the draft cites) — that's the
  // trust/value view a reviewer needs first, not the agent's internal trace.
  const [tab, setTab] = useState<Tab>('sources');
  const [highlightedCite, setHighlightedCite] = useState<string | null>(null);

  const tabs: Array<{ id: Tab; label: string }> = [
    { id: 'sources', label: '根拠' },
    { id: 'client', label: '顧問先' },
    { id: 'chat', label: 'AIに相談' },
    { id: 'status', label: '状態' },
  ];

  return (
    <aside className="sidecar">
      <header className="sidecar-head">
        <div className="sidecar-head-row">
          <span className="sidecar-title">AI コンテキスト</span>
          <span className="lifecycle-pill" data-state={props.lifecycleState}>
            <span className="lifecycle-dot" />
            {props.lifecycleLabel}
          </span>
        </div>
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
      </header>

      <div className="sidecar-body" key={tab}>
        {tab === 'chat' && (
          <ChatTab inquiryId={props.inquiryId} inquiryStatus={props.inquiryStatus} />
        )}
        {tab === 'sources' && (
          <SourcesTab
            citations={props.sources}
            highlightedCite={highlightedCite}
            onCiteHover={setHighlightedCite}
            onCiteLeave={() => setHighlightedCite(null)}
          />
        )}
        {tab === 'client' && <ClientTab data={props.client} />}
        {tab === 'status' && <StatusTab data={props.status} />}
      </div>
    </aside>
  );
}
