'use client';

import { Icon } from '@/components/ui/icon';

async function startChatworkOAuth(): Promise<void> {
  const res = await fetch('/api/integrations/oauth/authorize/chatwork', { method: 'POST' });
  if (!res.ok) {
    alert(`OAuth 開始に失敗しました: ${res.status}`);
    return;
  }
  const { authorizationUrl } = (await res.json()) as { authorizationUrl: string };
  window.location.assign(authorizationUrl);
}

type Props = { connected: boolean; configured: boolean };

export function ChatworkConnectButton({ connected, configured }: Props) {
  if (!configured) {
    return (
      <div style={{ fontSize: 12, color: 'var(--muted)' }}>
        サーバーに Chatwork アプリの認証情報 (CHATWORK_CLIENT_ID / SECRET / REDIRECT_URI)
        が未設定です。設定すると、ここから OAuth 連携できます。
      </div>
    );
  }
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <button type="button" className="btn btn-primary" onClick={startChatworkOAuth}>
        <Icon name="spark" size={14} /> {connected ? 'Chatworkを再連携' : 'Chatworkと連携'}
      </button>
      {connected && (
        <span style={{ fontSize: 12, color: 'var(--positive)', fontWeight: 500 }}>連携中</span>
      )}
    </div>
  );
}
