import { auth } from '@clerk/nextjs/server';
import {
  findIntegration,
  getFirm,
  getFirmChannel,
  getInboxCounts,
  getMembership,
  listClients,
  listFirmTree,
  listUnmatchedLineEvents,
} from '@zeiro/db';
import { headers } from 'next/headers';
import { CopyButton } from '@/components/onboarding/copy-button';
import { ChatworkChannelForm } from '@/components/settings/chatwork-channel-form';
import { ChatworkConnectButton } from '@/components/settings/chatwork-connect-button';
import { EmailInboundSection } from '@/components/settings/email-inbound-section';
import { FreeeSection } from '@/components/settings/freee-section';
import { InviteMemberForm } from '@/components/settings/invite-member-form';
import { LineChannelForm } from '@/components/settings/line-channel-form';
import { PendingInvitations } from '@/components/settings/pending-invitations';
import { PendingLineLinks } from '@/components/settings/pending-line-links';
import { TeamTree } from '@/components/settings/team-tree';
import { TombstoneSection } from '@/components/settings/tombstone-section';
import { WebChannelSection } from '@/components/settings/web-channel-section';
import { ConfidentialityTrust } from '@/components/trust/confidentiality';
import { parseChatworkConfig } from '@/lib/chatwork/parse';
import { env } from '@/lib/env';
import { requireFirmContext } from '@/lib/firm-context';
import { asTier } from '@/lib/team';
import { listPendingInvitations } from '@/lib/team-server';

type SettingsSearchParams = {
  integration?: string;
  status?: string;
  message?: string;
};

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<SettingsSearchParams>;
}) {
  const ctx = await requireFirmContext();
  const { firmId, userId } = ctx;
  const isOwner = ctx.role === 'owner';
  const flash = await searchParams;
  const [
    channel,
    webChannel,
    baseUrl,
    pending,
    clients,
    treeMembers,
    actorMembership,
    firm,
    session,
    inboxCounts,
    freeeIntegration,
    chatworkChannel,
    chatworkIntegration,
  ] = await Promise.all([
    getFirmChannel(firmId, 'line'),
    getFirmChannel(firmId, 'web'),
    buildBaseUrl(),
    isOwner ? listUnmatchedLineEvents(firmId) : Promise.resolve([]),
    isOwner ? listClients(firmId) : Promise.resolve([]),
    // Everyone in the firm can SEE the tree; edit affordances are gated by
    // `canEditTier` / `canEditSupervisor` per row.
    listFirmTree(firmId),
    getMembership(userId, firmId),
    getFirm(firmId),
    auth(),
    getInboxCounts(firmId),
    findIntegration(firmId, 'freee'),
    getFirmChannel(firmId, 'chatwork'),
    findIntegration(firmId, 'chatwork'),
  ]);
  const canConfigureOAuth = Boolean(
    env.FREEE_CLIENT_ID && env.FREEE_CLIENT_SECRET && env.FREEE_REDIRECT_URI,
  );
  const freeeView = freeeIntegration
    ? {
        status: (freeeIntegration.status === 'active'
          ? 'connected'
          : freeeIntegration.status === 'needs_reconnect'
            ? 'needs_reconnect'
            : freeeIntegration.status === 'revoked'
              ? 'revoked'
              : 'error') as 'connected' | 'needs_reconnect' | 'revoked' | 'error',
        lastError: freeeIntegration.lastError,
        companies:
          ((freeeIntegration.metadata as Record<string, unknown>)?.companies as Array<{
            id: string;
            name: string;
            role: string;
          }>) ?? [],
        connectedAt: freeeIntegration.createdAt.toISOString(),
      }
    : { status: 'not_connected' as const };
  const invitations =
    isOwner && firm.clerkOrgId ? await listPendingInvitations(firm.clerkOrgId).catch(() => []) : [];
  const webhookUrl = `${baseUrl}/api/channels/line/${firmId}`;
  const chatworkWebhookUrl = `${baseUrl}/api/channels/chatwork/${firmId}`;
  const chatworkConfig = parseChatworkConfig(chatworkChannel?.config);
  const chatworkConnected = chatworkIntegration?.status === 'active';
  const chatworkOAuthConfigured = Boolean(
    env.CHATWORK_CLIENT_ID && env.CHATWORK_CLIENT_SECRET && env.CHATWORK_REDIRECT_URI,
  );
  const contactUrl = `${baseUrl}/contact/${firmId}`;
  const actorTier = asTier(actorMembership?.tier);
  void session; // keep the auth() side-effect; member identification now uses firmContext.userId

  return (
    <div className="kb-pane anim-stagger">
      <div className="kb-head">
        <div>
          <div className="kb-title">設定</div>
          <div className="kb-sub">事務所の連携・チャネル設定 (所長のみ編集可)</div>
        </div>
      </div>

      <ConfidentialityTrust />

      <EmailInboundSection
        inboundAddress={firm.inboundAddress}
        unmatchedCount={inboxCounts.unmatched}
      />

      {isOwner && (
        <FreeeSection
          view={freeeView}
          canConfigureOAuth={canConfigureOAuth}
          flash={
            flash.integration === 'freee'
              ? {
                  ...(flash.status !== undefined ? { status: flash.status } : {}),
                  ...(flash.message !== undefined ? { message: flash.message } : {}),
                }
              : undefined
          }
        />
      )}

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
            <li>
              Messaging API タブで long-lived Channel Access Token を発行 → 下のフォームに貼り付け
            </li>
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
            <code
              style={{ fontFamily: 'var(--font-mono)', fontSize: 12, overflowWrap: 'anywhere' }}
            >
              {webhookUrl}
            </code>
          </div>
          <CopyButton text={webhookUrl} />
        </div>

        <ChannelStatus channel={channel} />

        {isOwner ? (
          <LineChannelForm configured={Boolean(channel)} enabled={channel?.enabled ?? false} />
        ) : (
          <div style={{ color: 'var(--muted)', fontSize: 13 }}>
            設定の変更は事務所管理者 (所長) のみ可能です。
          </div>
        )}
      </section>

      {isOwner && (
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
            <h2
              style={{ fontFamily: 'var(--font-sans)', fontSize: 16, fontWeight: 600, margin: 0 }}
            >
              Chatwork 連携
            </h2>
            <p style={{ color: 'var(--muted)', fontSize: 13, marginTop: 6 }}>
              顧問先ごとの Chatwork ルームのメッセージを問い合わせとして取り込み、AI
              が下書きを生成します。各顧問先の「Chatwork ルームID」は顧問先の編集画面で設定します。
            </p>
          </header>

          <div>
            <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 6 }}>
              返信用アカウント連携 (OAuth)
            </div>
            <p style={{ color: 'var(--muted)', fontSize: 12, margin: '0 0 8px' }}>
              下書きの返信投稿に使うアカウントを OAuth で連携します (推奨)。未連携の場合は下の
              フォームの API トークンでも投稿できます。受信用の Webhook トークンと連携アカウントID
              は下のフォームで設定してください。
            </p>
            <ChatworkConnectButton
              connected={chatworkConnected}
              configured={chatworkOAuthConfigured}
            />
          </div>

          <details>
            <summary style={{ cursor: 'pointer', color: 'var(--ink-2)' }}>セットアップ手順</summary>
            <ol style={{ marginTop: 12, fontSize: 13, lineHeight: 1.8, color: 'var(--ink-2)' }}>
              <li>
                上の「Chatworkと連携」で返信用アカウントを OAuth 連携 (または下のフォームに API
                トークンを貼り付け)
              </li>
              <li>
                Webhook 設定 (メッセージ作成) で下記 URL を登録し、発行された Webhook
                トークンを下のフォームに貼り付け
              </li>
              <li>連携アカウントの ID を下のフォームに入力 (自分の投稿を取り込まないため)</li>
              <li>各顧問先の編集画面で対応する Chatwork ルームID を設定</li>
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
              <span
                style={{ fontSize: 11, color: 'var(--muted-2)', fontFamily: 'var(--font-mono)' }}
              >
                WEBHOOK URL
              </span>
              <code
                style={{ fontFamily: 'var(--font-mono)', fontSize: 12, overflowWrap: 'anywhere' }}
              >
                {chatworkWebhookUrl}
              </code>
            </div>
            <CopyButton text={chatworkWebhookUrl} />
          </div>

          <ChatworkChannelForm
            configured={Boolean(chatworkConfig)}
            enabled={chatworkChannel?.enabled ?? false}
            botAccountId={chatworkConfig?.botAccountId ?? ''}
          />
        </section>
      )}

      <section className="team-section">
        <header className="team-section-head">
          <div>
            <h2 className="team-section-title">メンバーと階層</h2>
            <p className="team-section-sub">
              事務所のメンバーと上下関係を一目で確認できます。エスカレーション (上位への引き継ぎ)
              は、ここで設定した上司に自動で振り分けられます。
            </p>
          </div>
          <div className="team-section-legend">
            <span className="tier-mini tier-admin">所長</span>
            <span className="tier-mini tier-senior">上席</span>
            <span className="tier-mini tier-member">担当</span>
          </div>
        </header>

        <TeamTree
          members={treeMembers}
          currentUserId={userId}
          currentUserTier={actorTier}
          isAdmin={isOwner}
        />

        {isOwner && (
          <>
            {invitations.length > 0 && (
              <div className="team-pending">
                <div className="kb-section-eyebrow">未承諾の招待 ({invitations.length}件)</div>
                <PendingInvitations invitations={invitations} />
              </div>
            )}
            <div className="team-invite-block">
              <div className="kb-section-eyebrow">新しいメンバーを招待</div>
              <InviteMemberForm />
            </div>
          </>
        )}
      </section>

      {isOwner && <TombstoneSection />}

      {isOwner && (
        <WebChannelSection enabled={webChannel?.enabled ?? false} shareUrl={contactUrl} />
      )}

      {isOwner && (
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
            <h2
              style={{ fontFamily: 'var(--font-sans)', fontSize: 16, fontWeight: 600, margin: 0 }}
            >
              LINE 未紐付けユーザー
            </h2>
            <p style={{ color: 'var(--muted)', fontSize: 13, marginTop: 6 }}>
              事務所宛に LINE で連絡してきたが、まだ顧問先に紐付いていないユーザーです。
              紐付けると以降の問い合わせが正しい顧問先のスレッドに集約されます。
            </p>
          </header>
          <PendingLineLinks pending={pending} clients={clients} />
        </section>
      )}
    </div>
  );
}

function ChannelStatus({ channel }: { channel: { enabled: boolean; createdAt: Date } | null }) {
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

async function buildBaseUrl(): Promise<string> {
  const h = await headers();
  const host = h.get('x-forwarded-host') ?? h.get('host') ?? 'localhost:6001';
  const proto = h.get('x-forwarded-proto') ?? (host.startsWith('localhost') ? 'http' : 'https');
  return `${proto}://${host}`;
}
