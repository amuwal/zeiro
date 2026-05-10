'use client';

import type { DraftWithCitations, InquiryWithClient } from '@zeiro/db';
import { type ReactNode, useState } from 'react';
import { rejectDraft, sendDraft, sendEditedDraft } from '@/app/(app)/inbox/actions';
import { Icon } from '@/components/ui/icon';
import { EditableDraftCard } from './editable-draft-card';

type Props = {
  inquiry: InquiryWithClient;
  draft: DraftWithCitations | null;
  isEscalated: boolean;
  primaryDurationMin: number | null;
  preDraft: ReactNode;
  postDraft: ReactNode;
};

export function DraftReviewForm({
  inquiry,
  draft,
  isEscalated,
  primaryDurationMin,
  preDraft,
  postDraft,
}: Props) {
  const [editing, setEditing] = useState(false);
  const [body, setBody] = useState(draft?.body ?? '');
  const edited = draft != null && body !== draft.body;

  return (
    <>
      <div className="detail-body detail-anim">
        {preDraft}
        {draft ? (
          <EditableDraftCard
            draft={draft}
            editing={editing}
            body={body}
            edited={edited}
            onToggleEdit={() => setEditing((e) => !e)}
            onChangeBody={setBody}
          />
        ) : isEscalated ? (
          <NoDraftCard />
        ) : null}
        {postDraft}
      </div>
      <footer className="detail-actions">
        <div className="action-meta">
          <span className="item">
            <Icon name="shield" size={12} /> <b>テナント分離</b> 有効
          </span>
          {primaryDurationMin !== null && (
            <span className="item">
              <Icon name="clock" size={12} /> 一次対応 <b>{formatMinutes(primaryDurationMin)}</b>
            </span>
          )}
          <span className="item">
            <Icon name="doc" size={12} /> 監査ログ <b>記録中</b>
          </span>
        </div>
        <form className="btn-cluster">
          <input type="hidden" name="inquiryId" value={inquiry.id} />
          <input type="hidden" name="body" value={body} />
          <button type="submit" className="btn btn-ghost" formAction={rejectDraft}>
            <Icon name="x" size={13} /> 却下
          </button>
          <button
            type="submit"
            className="btn btn-secondary"
            disabled={!draft || !edited}
            formAction={sendEditedDraft}
          >
            <Icon name="edit" size={13} /> 編集して送信
          </button>
          <button
            type="submit"
            className="btn btn-primary"
            disabled={!draft || edited}
            formAction={sendDraft}
          >
            <Icon name="send" size={13} /> そのまま送信 <span className="kbd">⌘↵</span>
          </button>
        </form>
      </footer>
    </>
  );
}

function NoDraftCard() {
  return (
    <div className="section">
      <div className="section-head">
        <span>AI DRAFT</span>
        <span className="badge">SUPPRESSED</span>
      </div>
      <div
        className="orig-card"
        style={{
          background: 'var(--surface-2)',
          textAlign: 'center',
          padding: '32px 20px',
          color: 'var(--muted)',
        }}
      >
        <div style={{ fontSize: 13 }}>
          下書きは生成されていません — 個別判断が必要なため、所長税理士にお繋ぎします。
        </div>
      </div>
    </div>
  );
}

function formatMinutes(minutes: number): string {
  if (minutes < 1) return '1分未満';
  const m = Math.floor(minutes);
  const s = Math.round((minutes - m) * 60);
  return s === 0 ? `${m}分` : `${m}分${s}秒`;
}
