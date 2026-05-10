'use client';

import { useActionState } from 'react';
import { type SaveLineState, saveLineChannel } from '@/app/(app)/settings/actions';

const initial: SaveLineState = { error: null, ok: false };

type Props = {
  configured: boolean;
  enabled: boolean;
};

export function LineChannelForm({ configured, enabled }: Props) {
  const [state, action, pending] = useActionState(saveLineChannel, initial);

  return (
    <form action={action} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <label htmlFor="line-secret" style={{ fontSize: 12, fontWeight: 500 }}>
          Channel Secret
        </label>
        <input
          id="line-secret"
          name="channelSecret"
          type="password"
          autoComplete="off"
          placeholder={configured ? '••••• (設定済み — 変更時のみ入力)' : 'LINE Developers から取得'}
          style={inputStyle}
        />
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <label htmlFor="line-token" style={{ fontSize: 12, fontWeight: 500 }}>
          Channel Access Token (long-lived)
        </label>
        <input
          id="line-token"
          name="channelAccessToken"
          type="password"
          autoComplete="off"
          placeholder={configured ? '••••• (設定済み — 変更時のみ入力)' : 'LINE Developers から取得'}
          style={inputStyle}
        />
      </div>

      <label style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 13 }}>
        <input type="checkbox" name="enabled" defaultChecked={enabled} />
        この LINE チャネルを有効化
      </label>

      {state.error && (
        <div style={{ color: 'var(--urgent)', fontSize: 12 }}>{state.error}</div>
      )}
      {state.ok && (
        <div style={{ color: 'var(--positive)', fontSize: 12 }}>設定を保存しました</div>
      )}

      <div>
        <button type="submit" className="btn btn-primary" disabled={pending}>
          {pending ? '保存中…' : '保存'}
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
