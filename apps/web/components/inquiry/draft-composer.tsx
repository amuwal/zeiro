'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import { regenerateDraftAction } from '@/app/(app)/inbox/actions';
import { Icon } from '@/components/ui/icon';

export type DraftView = {
  body: string;
  citationCount: number;
  confidence: number;
  model: string;
  time: string;
};

// Placeholder is a neutral skeleton — we don't claim "AI is generating" because
// an empty draft just means none was produced (e.g. agent escalated). User can
// type directly, or hit 再生成 to retry the pipeline.
const SKELETON_PLACEHOLDER =
  'ここに返信内容を入力してください。\n\n[あいさつ]\n\n[本文]\n\n[締めの一文]';

export function DraftComposer({ draft, inquiryId }: { draft: DraftView | null; inquiryId: string }) {
  const [text, setText] = useState(draft?.body ?? '');
  const [regenerating, startRegen] = useTransition();
  const ta = useRef<HTMLTextAreaElement>(null);

  const regenerate = () => {
    startRegen(() => {
      regenerateDraftAction(inquiryId).catch((e) => {
        // Surface in console for now; persistResult already audits failures.
        // biome-ignore lint/suspicious/noConsole: surface user-visible failure
        console.error('regenerate failed', e);
      });
    });
  };

  useEffect(() => {
    setText(draft?.body ?? '');
  }, [draft?.body]);

  useEffect(() => {
    if (!ta.current) return;
    ta.current.style.height = 'auto';
    ta.current.style.height = `${Math.min(ta.current.scrollHeight, 360)}px`;
  }, [text]);

  const hasDraft = draft !== null;

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
      />

      <div className="draft-composer-actions">
        <button
          type="button"
          className="btn btn-ghost"
          onClick={regenerate}
          disabled={regenerating}
        >
          <Icon name="spark" size={12} /> {regenerating ? '生成中…' : '再生成'}
        </button>
        <button type="button" className="icon-btn-sm" title="添付">
          <Icon name="paperclip" size={13} />
        </button>
        <button type="button" className="icon-btn-sm" title="ナレッジ参照">
          <Icon name="book" size={13} />
        </button>
        <span className="spacer" />
        <button type="button" className="btn btn-ghost">
          <Icon name="x" size={12} /> 却下
        </button>
        <button type="button" className="btn btn-ghost">
          <Icon name="arrow-right" size={12} /> 所長に転送
        </button>
        <button type="button" className="btn btn-secondary" disabled={!hasDraft}>
          <Icon name="check" size={12} /> そのまま送信
        </button>
        <button type="button" className="btn btn-primary">
          <Icon name="send" size={12} /> 編集して送信
          <span className="kbd">⌘↵</span>
        </button>
      </div>

      <div className="composer-meta">
        <div className="group">
          <span className="item"><Icon name="shield" size={11} /> <b>テナント分離</b> 有効</span>
          <span className="item"><Icon name="clock" size={11} /> 一次対応 <b>—</b></span>
        </div>
        <span className="item">監査ログ <b>記録中</b></span>
      </div>
    </div>
  );
}
