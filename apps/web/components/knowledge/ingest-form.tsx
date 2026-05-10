'use client';

import { useActionState } from 'react';
import {
  type IngestState,
  ingestKnowledgeAction,
} from '@/app/(app)/knowledge/actions';

const initial: IngestState = { error: null };

export function IngestForm() {
  const [state, action, pending] = useActionState(ingestKnowledgeAction, initial);

  return (
    <form action={action} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <label htmlFor="source" style={{ fontSize: 12, fontWeight: 500 }}>
          出典 (例: 事務所マニュアル §4.2)
        </label>
        <input
          id="source"
          name="source"
          required
          placeholder="事務所マニュアル §4.2"
          style={inputStyle}
        />
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <label htmlFor="file" style={{ fontSize: 12, fontWeight: 500 }}>
          ファイル (任意 — .txt / .eml / .md)
        </label>
        <input id="file" name="file" type="file" accept=".txt,.eml,.md" />
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <label htmlFor="body" style={{ fontSize: 12, fontWeight: 500 }}>
          または本文を直接貼り付け
        </label>
        <textarea
          id="body"
          name="body"
          rows={10}
          placeholder="ナレッジとして取り込む本文を貼り付け…"
          style={{ ...inputStyle, fontFamily: 'inherit', resize: 'vertical' }}
        />
      </div>

      <label style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 12 }}>
        <input type="checkbox" name="isEmail" />
        メール (.eml) として解析
      </label>

      {state.error && (
        <div style={{ color: 'var(--urgent)', fontSize: 12 }}>{state.error}</div>
      )}

      <div>
        <button type="submit" className="btn btn-primary" disabled={pending}>
          {pending ? '取り込み中…' : '取り込み'}
        </button>
      </div>
    </form>
  );
}

const inputStyle: React.CSSProperties = {
  padding: '8px 10px',
  border: '1px solid var(--line)',
  borderRadius: 8,
  background: 'var(--surface)',
  fontSize: 13,
  outline: 'none',
};
