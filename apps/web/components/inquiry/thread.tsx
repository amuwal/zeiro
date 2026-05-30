'use client';

import { useState } from 'react';
import { Icon } from '@/components/ui/icon';
import { AssigneePicker } from './assignee-picker';
import { DraftComposer, type DraftView } from './draft-composer';
import type { SuggestionView } from './suggested-action';
import { type Turn, TurnView } from './turns';
import { UnmatchedBanner } from './unmatched-banner';

type Props = {
  meta: {
    id: string;
    subject: string;
    senderName: string;
    senderRole: string;
    senderCompany: string;
    senderInitials: string;
    category: string;
  };
  turns: Turn[];
  draft: DraftView | null;
  suggestion: SuggestionView;
  inquiryStatus: string;
  /** When status === 'unmatched', the sender's email so we can offer promotion. */
  unmatchedSender: string | null;
  /** Currently-assigned user; null = 未割当. */
  assignedTo: { id: string; name: string } | null;
  /** Viewer's permissions (from appRole) — gate the composer affordances. */
  canDraft: boolean;
  canSend: boolean;
};

const CATEGORY_JP: Record<string, string> = {
  deadline: '期日確認',
  docs: '書類提出',
  tax: '税務質問',
  contract: '顧問契約',
  other: 'その他',
};

export function Thread({
  meta,
  turns,
  draft,
  suggestion,
  inquiryStatus,
  unmatchedSender,
  assignedTo,
  canDraft,
  canSend,
}: Props) {
  const isUnmatched = inquiryStatus === 'unmatched';
  const [highlightedCite, setHighlightedCite] = useState<string | null>(null);
  const cat = CATEGORY_JP[meta.category] ?? meta.category;
  return (
    <section className="thread-col">
      <div className="thread-head">
        <div className="thread-crumbs">
          <span>受信トレイ</span>
          <span className="sep">/</span>
          <b>{cat}</b>
          <span className="id">INQ-{meta.id.slice(0, 8).toUpperCase()}</span>
          <div className="actions">
            <button type="button" className="icon-btn-sm" title="アーカイブ">
              <Icon name="archive" size={14} />
            </button>
            <button type="button" className="icon-btn-sm" title="その他">
              <Icon name="more" size={14} />
            </button>
          </div>
        </div>

        <h1 className="thread-subject">{meta.subject}</h1>

        <div className="thread-meta">
          <div className="thread-from">
            <div className="pic">{meta.senderInitials}</div>
            <span className="who">{meta.senderName}</span>
            {meta.senderRole && (
              <>
                <span className="sep">/</span>
                <span>{meta.senderRole}</span>
              </>
            )}
            {meta.senderCompany && meta.senderCompany !== meta.senderName && (
              <>
                <span className="sep">/</span>
                <span>{meta.senderCompany}</span>
              </>
            )}
          </div>
          <span className="thread-tag">
            <span className="swatch" />
            {cat}
          </span>
          <button type="button" className={`thread-suggest-pill suggest-${suggestion.tone}`}>
            <Icon name="spark" size={10} />
            <b>{suggestion.verb}</b>
            <span className="conf">{Math.round(suggestion.confidence * 100)}%</span>
          </button>
          <AssigneePicker
            inquiryId={meta.id}
            currentAssigneeId={assignedTo?.id ?? null}
            currentAssigneeName={assignedTo?.name ?? null}
          />
        </div>
      </div>

      <div className="thread-body">
        {isUnmatched && unmatchedSender && (
          <UnmatchedBanner
            inquiryId={meta.id}
            fromAddress={unmatchedSender}
            suggestedName={meta.senderCompany || meta.senderName}
          />
        )}
        {turns.map((t, i) => (
          <TurnView
            key={i}
            turn={t}
            highlightedCite={highlightedCite}
            onCiteHover={setHighlightedCite}
            onCiteLeave={() => setHighlightedCite(null)}
          />
        ))}
      </div>

      {!isUnmatched && (
        <DraftComposer
          draft={draft}
          inquiryId={meta.id}
          inquiryStatus={inquiryStatus}
          canDraft={canDraft}
          canSend={canSend}
        />
      )}
    </section>
  );
}
