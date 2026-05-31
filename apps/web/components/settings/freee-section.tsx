'use client';

import { disconnectFreee, refreshFreeeCompanies } from '@/app/(app)/settings/freee-actions';
import { Icon } from '@/components/ui/icon';

type CompanyMini = { id: string; name: string; role: string };

type FreeeIntegrationView =
  | { status: 'not_connected' }
  | {
      status: 'connected' | 'needs_reconnect' | 'revoked' | 'error';
      lastError: string | null;
      companies: CompanyMini[];
      connectedAt: string;
    };

type Props = {
  view: FreeeIntegrationView;
  canConfigureOAuth: boolean;
  flash?: { status?: string; message?: string } | undefined;
};

export function FreeeSection({ view, canConfigureOAuth, flash }: Props) {
  return (
    <section className="kb-card freee-section">
      <header className="freee-header">
        <div>
          <h3 className="freee-title">freee 会計連携</h3>
          <p className="freee-sub">
            事務所の freee アカウントを連携すると、AI
            が下書き作成時に顧問先の取引データを参照できます。
          </p>
        </div>
        <StatusBadge view={view} />
      </header>

      {flash?.status === 'connected' && (
        <div className="freee-flash freee-flash-ok">freee と連携しました。</div>
      )}
      {flash?.status === 'error' && (
        <div className="freee-flash freee-flash-error">
          連携に失敗しました{flash.message ? `: ${flash.message}` : ''}
        </div>
      )}

      {view.status === 'not_connected' ? (
        <ConnectButton canConfigureOAuth={canConfigureOAuth} />
      ) : (
        <ConnectedView view={view} canConfigureOAuth={canConfigureOAuth} />
      )}
    </section>
  );
}

function StatusBadge({ view }: { view: FreeeIntegrationView }) {
  if (view.status === 'not_connected') {
    return <span className="freee-badge freee-badge-off">未連携</span>;
  }
  if (view.status === 'connected') {
    return <span className="freee-badge freee-badge-ok">連携中</span>;
  }
  return <span className="freee-badge freee-badge-warn">要再連携</span>;
}

function ConnectButton({ canConfigureOAuth }: { canConfigureOAuth: boolean }) {
  if (!canConfigureOAuth) {
    return (
      <div className="freee-empty">
        サーバーに freee アプリの認証情報が未設定です。`.env.local` の FREEE_CLIENT_ID / SECRET /
        REDIRECT_URI を設定すると、ここから連携できるようになります。
      </div>
    );
  }
  return (
    <button type="button" className="freee-connect-btn" onClick={startOAuth}>
      <Icon name="spark" size={14} /> freee と連携する
    </button>
  );
}

function ConnectedView({
  view,
  canConfigureOAuth,
}: {
  view: Exclude<FreeeIntegrationView, { status: 'not_connected' }>;
  canConfigureOAuth: boolean;
}) {
  return (
    <div className="freee-connected">
      <div className="freee-meta">
        <div>
          <span className="freee-meta-label">連携日</span>
          <span className="freee-meta-value">
            {new Date(view.connectedAt).toLocaleString('ja-JP')}
          </span>
        </div>
        <div>
          <span className="freee-meta-label">参照可能な事業所</span>
          <span className="freee-meta-value">{view.companies.length} 件</span>
        </div>
      </div>

      {view.companies.length > 0 && (
        <ul className="freee-companies">
          {view.companies.map((c) => (
            <li key={c.id}>
              <span className="freee-company-name">{c.name || `事業所 ${c.id}`}</span>
              <span className="freee-company-meta">
                ID: {c.id} · 権限: {c.role}
              </span>
            </li>
          ))}
        </ul>
      )}

      {view.status !== 'connected' && (
        <div className="freee-warn">
          トークンの更新に失敗しています。{view.lastError ? `理由: ${view.lastError}` : ''}
          再連携してください。
        </div>
      )}

      <div className="freee-actions">
        {canConfigureOAuth &&
          (view.status === 'connected' ? (
            <button type="button" className="freee-reauth-btn" onClick={startOAuth}>
              再連携
            </button>
          ) : (
            <button
              type="button"
              className="freee-reauth-btn freee-reauth-warn"
              onClick={startOAuth}
            >
              <Icon name="alert" size={13} /> 再連携が必要
            </button>
          ))}
        <form action={async () => refreshFreeeCompanies()}>
          <button type="submit" className="freee-reauth-btn">
            <Icon name="spark" size={13} /> 事業所リストを更新
          </button>
        </form>
        <form action={async () => disconnectFreee()}>
          <button type="submit" className="freee-disconnect-btn">
            連携を解除
          </button>
        </form>
      </div>
    </div>
  );
}

async function startOAuth(): Promise<void> {
  const res = await fetch('/api/integrations/oauth/authorize/freee', { method: 'POST' });
  if (!res.ok) {
    alert(`OAuth 開始に失敗しました: ${res.status}`);
    return;
  }
  const { authorizationUrl } = (await res.json()) as { authorizationUrl: string };
  window.location.assign(authorizationUrl);
}
