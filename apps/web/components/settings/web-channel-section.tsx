'use client';

import { useActionState } from 'react';
import { type SaveWebState, saveWebChannel } from '@/app/(app)/settings/actions';
import { CopyButton } from '@/components/onboarding/copy-button';

const initial: SaveWebState = { error: null, ok: false };

type Props = {
  enabled: boolean;
  shareUrl: string;
};

export function WebChannelSection({ enabled, shareUrl }: Props) {
  const [state, action, pending] = useActionState(saveWebChannel, initial);
  const currentlyEnabled = state.ok ? !state.error : enabled;

  return (
    <section
      style={{
        background: 'var(--surface)',
        border: '1px solid var(--line)',
        borderRadius: 14,
        padding: '1.5rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '1rem',
      }}
    >
      <header>
        <h2 style={{ fontFamily: 'var(--font-sans)', fontSize: 16, fontWeight: 600, margin: 0 }}>
          Webお問い合わせフォーム
        </h2>
        <p style={{ color: 'var(--muted)', fontSize: 13, marginTop: 6, lineHeight: 1.7 }}>
          事務所Webサイトや名刺のQRコードから誘導できる公開フォームを提供します。送信内容は通常の問い合わせと同じパイプラインで処理されます。
        </p>
      </header>

      <div
        style={{
          background: 'var(--surface-2)',
          border: '1px solid var(--line)',
          borderRadius: 10,
          padding: '12px 14px',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          justifyContent: 'space-between',
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
          <span style={{ fontSize: 11, color: 'var(--muted-2)', fontFamily: 'var(--font-mono)' }}>
            FORM URL
          </span>
          <code style={{ fontFamily: 'var(--font-mono)', fontSize: 12, overflowWrap: 'anywhere' }}>
            {shareUrl}
          </code>
        </div>
        <CopyButton text={shareUrl} />
      </div>

      <div style={{ color: 'var(--muted)', fontSize: 12 }}>
        ステータス:{' '}
        <strong style={{ color: currentlyEnabled ? 'var(--positive)' : 'var(--urgent)' }}>
          {currentlyEnabled ? '受付中' : '停止中'}
        </strong>
      </div>

      <form action={action} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <label style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 13 }}>
          <input type="checkbox" name="enabled" defaultChecked={enabled} />
          このフォームを公開する
        </label>

        {state.error && <div style={{ color: 'var(--urgent)', fontSize: 12 }}>{state.error}</div>}
        {state.ok && !state.error && (
          <div style={{ color: 'var(--positive)', fontSize: 12 }}>設定を保存しました</div>
        )}

        <div>
          <button type="submit" className="btn btn-primary" disabled={pending}>
            {pending ? '保存中…' : '保存'}
          </button>
        </div>
      </form>
    </section>
  );
}
