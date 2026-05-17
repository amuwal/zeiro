'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import {
  escalateInquiryAction,
  regenerateDraftAction,
  rejectDraftAction,
  sendDraftAction,
  sendEditedDraftAction,
} from '@/app/(app)/inbox/actions';
import { Icon } from '@/components/ui/icon';
import { SentDraftView } from './sent-draft-view';
import { useDraftConflict } from './use-draft-conflict';

export type DraftView = {
  body: string;
  citationCount: number;
  confidence: number;
  model: string;
  time: string;
};

const SKELETON_PLACEHOLDER =
  'ここに返信内容を入力してください。\n\n[あいさつ]\n\n[本文]\n\n[締めの一文]';

type Props = {
  draft: DraftView | null;
  inquiryId: string;
  inquiryStatus: string;
};

export function DraftComposer({ draft, inquiryId, inquiryStatus }: Props) {
  const { text, setText, pendingDraftBody, loadIncoming, keepMyEdits } = useDraftConflict(
    draft?.body ?? '',
  );
  const [busy, startTransition] = useTransition();
  const [busyKind, setBusyKind] = useState<null | 'regen' | 'send' | 'reject' | 'escalate'>(null);
  const [error, setError] = useState<string | null>(null);
  const ta = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!ta.current) return;
    ta.current.style.height = 'auto';
    ta.current.style.height = `${Math.min(ta.current.scrollHeight, 360)}px`;
  }, [text]);

  const hasDraft = draft !== null;
  const isSent = inquiryStatus === 'sent';
  const isEdited = hasDraft && text.trim() !== draft.body.trim();

  const run = (kind: typeof busyKind, fn: () => Promise<void>) => {
    setError(null);
    setBusyKind(kind);
    startTransition(() => {
      fn()
        .catch((e) => setError(e instanceof Error ? e.message : 'failed'))
        .finally(() => setBusyKind(null));
    });
  };

  if (isSent) return <SentDraftView draft={draft} />;

  return (
    <div className="draft-composer">
      <div className="draft-composer-strip">
        <span className="mini-stat">
          <Icon name="spark" size={11} /> AI下書き
        </span>
        <span className="strip-divider" />
        <span className="mini-stat">
          <b>{draft?.citationCount ?? 0}</b> KB参照
        </span>
        <span className="strip-divider" />
        <span className="mini-stat">
          信頼度 <b>{hasDraft ? Math.round((draft?.confidence ?? 0) * 100) : '—'}%</b>
        </span>
        <span className="strip-divider" />
        <span className="mini-stat">{(draft?.model ?? 'CLAUDE-4.5').toUpperCase()}</span>
        <span className="gen-time">{draft?.time ?? '—'}</span>
      </div>

      <textarea
        ref={ta}
        className="draft-editor"
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={SKELETON_PLACEHOLDER}
        rows={6}
        disabled={busy}
      />

      {pendingDraftBody !== null && (
        <div className="draft-composer-toast">
          <Icon name="spark" size={11} />
          <span>新しい下書きが届きました（あなたの編集中です）</span>
          <button type="button" className="btn btn-ghost btn-sm" onClick={keepMyEdits}>
            編集を維持
          </button>
          <button type="button" className="btn btn-secondary btn-sm" onClick={loadIncoming}>
            読み込む
          </button>
        </div>
      )}

      <div className="draft-composer-actions">
        <button
          type="button"
          className="btn btn-ghost"
          onClick={() => run('regen', () => regenerateDraftAction(inquiryId))}
          disabled={busy}
        >
          <Icon name="spark" size={12} /> {busyKind === 'regen' ? '生成中…' : '再生成'}
        </button>
        <button type="button" className="icon-btn-sm" title="添付" disabled={busy}>
          <Icon name="paperclip" size={13} />
        </button>
        <button type="button" className="icon-btn-sm" title="ナレッジ参照" disabled={busy}>
          <Icon name="book" size={13} />
        </button>
        <span className="spacer" />
        <button
          type="button"
          className="btn btn-ghost"
          onClick={() => run('reject', () => rejectDraftAction(inquiryId))}
          disabled={busy || !hasDraft}
        >
          <Icon name="x" size={12} /> {busyKind === 'reject' ? '処理中…' : '却下'}
        </button>
        <button
          type="button"
          className="btn btn-ghost"
          onClick={() => run('escalate', () => escalateInquiryAction(inquiryId))}
          disabled={busy}
        >
          <Icon name="arrow-right" size={12} />{' '}
          {busyKind === 'escalate' ? '転送中…' : '所長に転送'}
        </button>
        <button
          type="button"
          className="btn btn-secondary"
          onClick={() => run('send', () => sendDraftAction(inquiryId))}
          disabled={busy || !hasDraft || isEdited}
          title={isEdited ? '編集された内容は「編集して送信」で送ってください' : undefined}
        >
          <Icon name="check" size={12} /> {busyKind === 'send' ? '送信中…' : 'そのまま送信'}
        </button>
        <button
          type="button"
          className="btn btn-primary"
          onClick={() => run('send', () => sendEditedDraftAction(inquiryId, text))}
          disabled={busy || text.trim().length === 0}
        >
          <Icon name="send" size={12} /> {busyKind === 'send' ? '送信中…' : '編集して送信'}
          <span className="kbd">⌘↵</span>
        </button>
      </div>

      {error && (
        <div className="draft-composer-error">
          <Icon name="alert" size={11} /> {error}
        </div>
      )}

      <div className="composer-meta">
        <div className="group">
          <span className="item">
            <Icon name="shield" size={11} /> <b>テナント分離</b> 有効
          </span>
          <span className="item">
            <Icon name="clock" size={11} /> 一次対応 <b>—</b>
          </span>
        </div>
        <span className="item">
          監査ログ <b>記録中</b>
        </span>
      </div>
    </div>
  );
}
