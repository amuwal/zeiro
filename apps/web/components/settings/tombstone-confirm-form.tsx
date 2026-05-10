'use client';

import type { ClientSearchHit } from '@zeiro/db';
import { useActionState } from 'react';
import { tombstoneClientAction } from '@/app/(app)/settings/tombstone-actions';
import { initialExecuteState } from '@/app/(app)/settings/tombstone-state';

type Props = {
  client: ClientSearchHit;
  onClear: () => void;
};

export function TombstoneConfirmForm({ client, onClear }: Props) {
  const [state, action, pending] = useActionState(tombstoneClientAction, initialExecuteState);

  if (state.status === 'success' && state.clientId === client.id) {
    return (
      <div style={successCardStyle}>
        <strong style={{ color: 'var(--positive)' }}>削除を実行しました</strong>
        <div style={{ fontSize: 12.5, color: 'var(--ink-2)', marginTop: 6 }}>
          {state.tombstonedInquiries} 件の問い合わせと {state.tombstonedDrafts}{' '}
          件の下書きをトームストン化しました。監査ログはそのまま保存されます。
        </div>
        <button
          type="button"
          onClick={onClear}
          className="btn btn-secondary"
          style={{ marginTop: 12, fontSize: 12 }}
        >
          別の顧問先を処理
        </button>
      </div>
    );
  }

  return (
    <form action={action} style={confirmCardStyle}>
      <input type="hidden" name="clientId" value={client.id} />
      <div style={{ fontSize: 13, color: 'var(--ink)' }}>
        <strong>{client.name}</strong> ({client.primaryEmail}) の削除を実行します。 対象:{' '}
        {client.inquiryCount} 件の問い合わせ。
      </div>
      <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <span style={labelStyle}>削除理由 (必須)</span>
        <textarea
          name="reason"
          required
          minLength={10}
          rows={3}
          placeholder="例: 顧客本人からの書面による削除要求 (受付日: 2026-05-10)"
          style={{ ...inputStyle, resize: 'vertical', fontFamily: 'inherit' }}
        />
      </label>
      <label style={{ display: 'flex', gap: 8, alignItems: 'flex-start', fontSize: 12.5 }}>
        <input type="checkbox" name="confirm" required />
        <span>
          上記顧問先に関する個人情報がトームストン化され、復元できないことを理解しました。
        </span>
      </label>
      {state.status === 'error' && (
        <div style={{ color: 'var(--urgent)', fontSize: 12 }}>{state.message}</div>
      )}
      <div style={{ display: 'flex', gap: 8 }}>
        <button
          type="submit"
          className="btn btn-primary"
          disabled={pending}
          style={{ background: 'var(--urgent)', borderColor: 'var(--urgent)' }}
        >
          {pending ? '処理中…' : '削除を実行'}
        </button>
        <button type="button" onClick={onClear} className="btn btn-secondary">
          キャンセル
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
const labelStyle: React.CSSProperties = {
  fontSize: 11,
  color: 'var(--muted-2)',
  fontFamily: 'var(--font-mono)',
  textTransform: 'uppercase',
  letterSpacing: '0.1em',
};
const confirmCardStyle: React.CSSProperties = {
  background: 'oklch(98% 0.015 25)',
  border: '1px solid oklch(85% 0.05 25)',
  borderRadius: 10,
  padding: 16,
  display: 'flex',
  flexDirection: 'column',
  gap: 12,
};
const successCardStyle: React.CSSProperties = {
  background: 'oklch(96% 0.03 150)',
  border: '1px solid oklch(84% 0.04 150)',
  borderRadius: 10,
  padding: 16,
};
