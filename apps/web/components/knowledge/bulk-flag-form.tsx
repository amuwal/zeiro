'use client';

import { useActionState } from 'react';
import { type BulkFlagState, bulkFlagBySearch } from '@/app/(app)/knowledge/actions';

const initial: BulkFlagState = { error: null, flagged: 0 };

export function BulkFlagForm() {
  const [state, action, pending] = useActionState(bulkFlagBySearch, initial);

  return (
    <form
      action={action}
      style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr auto',
        gap: 10,
        alignItems: 'end',
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <label htmlFor="bulk-query" style={{ fontSize: 11, color: 'var(--muted-2)', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
          検索キーワード
        </label>
        <input
          id="bulk-query"
          name="query"
          required
          placeholder="例: 役員報酬, 通達 X-Y"
          style={inputStyle}
        />
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <label htmlFor="bulk-reason" style={{ fontSize: 11, color: 'var(--muted-2)', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
          理由 (任意)
        </label>
        <input
          id="bulk-reason"
          name="reason"
          placeholder="例: 2026年改正"
          style={inputStyle}
        />
      </div>

      <button type="submit" className="btn btn-secondary" disabled={pending}>
        {pending ? '処理中…' : '一括フラグ'}
      </button>

      {state.error && (
        <div style={{ gridColumn: '1 / -1', color: 'var(--urgent)', fontSize: 12 }}>
          {state.error}
        </div>
      )}
      {state.flagged > 0 && !state.error && (
        <div style={{ gridColumn: '1 / -1', color: 'var(--positive)', fontSize: 12 }}>
          {state.flagged}件のチャンクを要レビューに設定しました
        </div>
      )}
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
