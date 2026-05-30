'use client';

import { useActionState } from 'react';
import { type SaveChatworkState, saveChatworkChannel } from '@/app/(app)/settings/actions';

const initial: SaveChatworkState = { error: null, ok: false };

type Props = {
  configured: boolean;
  enabled: boolean;
  botAccountId: string;
};

const inputStyle: React.CSSProperties = {
  padding: '8px 10px',
  border: '1px solid var(--line)',
  borderRadius: 8,
  background: 'var(--surface)',
  fontSize: 13,
};

export function ChatworkChannelForm({ configured, enabled, botAccountId }: Props) {
  const [state, action, pending] = useActionState(saveChatworkChannel, initial);

  return (
    <form action={action} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <label htmlFor="cw-token" style={{ fontSize: 12, fontWeight: 500 }}>
          API トークン
        </label>
        <input
          id="cw-token"
          name="apiToken"
          type="password"
          autoComplete="off"
          placeholder={
            configured ? '••••• (設定済み — 変更時のみ入力)' : 'Chatwork の API トークン'
          }
          style={inputStyle}
        />
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <label htmlFor="cw-webhook" style={{ fontSize: 12, fontWeight: 500 }}>
          Webhook トークン
        </label>
        <input
          id="cw-webhook"
          name="webhookToken"
          type="password"
          autoComplete="off"
          placeholder={
            configured ? '••••• (設定済み — 変更時のみ入力)' : 'Webhook 設定で発行されるトークン'
          }
          style={inputStyle}
        />
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <label htmlFor="cw-bot" style={{ fontSize: 12, fontWeight: 500 }}>
          連携アカウントの ID (任意)
        </label>
        <input
          id="cw-bot"
          name="botAccountId"
          type="text"
          autoComplete="off"
          defaultValue={botAccountId}
          placeholder="自分の投稿を取り込まないためのアカウントID"
          style={inputStyle}
        />
      </div>

      <label style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 13 }}>
        <input type="checkbox" name="enabled" defaultChecked={enabled} />
        この Chatwork チャネルを有効化
      </label>

      {state.error && <div style={{ color: 'var(--urgent)', fontSize: 12 }}>{state.error}</div>}
      {state.ok && <div style={{ color: 'var(--positive)', fontSize: 12 }}>設定を保存しました</div>}

      <div>
        <button type="submit" className="btn btn-primary" disabled={pending}>
          {pending ? '保存中…' : '保存'}
        </button>
      </div>
    </form>
  );
}
