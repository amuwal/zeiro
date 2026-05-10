import { getFirmChannel } from '@zeiro/db';
import { headers } from 'next/headers';
import { CopyButton } from '@/components/onboarding/copy-button';
import { LineChannelForm } from '@/components/settings/line-channel-form';
import { requireFirmContext } from '@/lib/firm-context';

export default async function SettingsPage() {
  const { firmId, role } = await requireFirmContext();
  const channel = await getFirmChannel(firmId, 'line');
  const webhookUrl = await buildWebhookUrl(firmId);
  const admin = role.toLowerCase().includes('admin');

  return (
    <div className="kb-pane anim-stagger">
      <div className="kb-head">
        <div>
          <div className="kb-title">設定</div>
          <div className="kb-sub">事務所の連携・チャネル設定 (所長のみ編集可)</div>
        </div>
      </div>

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
            LINE Official Account 連携
          </h2>
          <p style={{ color: 'var(--muted)', fontSize: 13, marginTop: 6 }}>
            顧問先からの LINE メッセージを Zeiro で受信・返信します。
          </p>
        </header>

        <details>
          <summary style={{ cursor: 'pointer', color: 'var(--ink-2)' }}>セットアップ手順</summary>
          <ol style={{ marginTop: 12, fontSize: 13, lineHeight: 1.8, color: 'var(--ink-2)' }}>
            <li>
              <a href="https://developers.line.biz/" target="_blank" rel="noopener noreferrer">
                LINE Developers Console
              </a>{' '}
              で Provider と Messaging API Channel を作成
            </li>
            <li>Channel の Webhook 設定で下記 URL を貼り付け、Use webhook を ON</li>
            <li>「Verify」をクリックして到達確認 (200 が返れば OK)</li>
            <li>Basic settings タブから Channel Secret をコピー → 下のフォームに貼り付け</li>
            <li>Messaging API タブで long-lived Channel Access Token を発行 → 下のフォームに貼り付け</li>
            <li>「有効化」をオンにして保存</li>
          </ol>
        </details>

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
              WEBHOOK URL
            </span>
            <code style={{ fontFamily: 'var(--font-mono)', fontSize: 12, overflowWrap: 'anywhere' }}>
              {webhookUrl}
            </code>
          </div>
          <CopyButton text={webhookUrl} />
        </div>

        <ChannelStatus channel={channel} />

        {admin ? (
          <LineChannelForm configured={Boolean(channel)} enabled={channel?.enabled ?? false} />
        ) : (
          <div style={{ color: 'var(--muted)', fontSize: 13 }}>
            設定の変更は事務所管理者 (所長) のみ可能です。
          </div>
        )}
      </section>
    </div>
  );
}

function ChannelStatus({
  channel,
}: {
  channel: { enabled: boolean; createdAt: Date } | null;
}) {
  if (!channel) {
    return (
      <div style={{ color: 'var(--muted)', fontSize: 12 }}>
        ステータス: <strong style={{ color: 'var(--ink-2)' }}>未設定</strong>
      </div>
    );
  }
  return (
    <div style={{ color: 'var(--muted)', fontSize: 12 }}>
      ステータス:{' '}
      <strong style={{ color: channel.enabled ? 'var(--positive)' : 'var(--urgent)' }}>
        {channel.enabled ? '有効' : '無効'}
      </strong>{' '}
      · 登録日: {channel.createdAt.toLocaleDateString('ja-JP')}
    </div>
  );
}

async function buildWebhookUrl(firmId: string): Promise<string> {
  const h = await headers();
  const host = h.get('x-forwarded-host') ?? h.get('host') ?? 'localhost:6001';
  const proto = h.get('x-forwarded-proto') ?? (host.startsWith('localhost') ? 'http' : 'https');
  return `${proto}://${host}/api/channels/line/${firmId}`;
}
