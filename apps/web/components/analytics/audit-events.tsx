import type { AuditRow } from '@zeiro/db';
import Link from 'next/link';
import { Icon, type IconName } from '@/components/ui/icon';
import { formatRelativeTime } from '@/lib/format';

type ActionMeta = { icon: IconName; jp: string; tone: 'ok' | 'warn' };

const ACTION_DISPLAY: Record<string, ActionMeta> = {
  'knowledge.updated': { icon: 'doc', jp: 'ナレッジ更新', tone: 'ok' },
  'channel.configured': { icon: 'settings', jp: 'チャネル設定', tone: 'ok' },
  'client.identity_linked': { icon: 'users', jp: '顧問先 LINE 紐付け', tone: 'ok' },
  'client.tombstoned': { icon: 'archive', jp: '削除要求対応', tone: 'warn' },
  'draft.bounced': { icon: 'alert', jp: 'メール バウンス', tone: 'warn' },
  'draft.spam_reported': { icon: 'alert', jp: 'スパム報告', tone: 'warn' },
  'draft.escalated': { icon: 'flag', jp: 'エスカレーション', tone: 'warn' },
};

export function AuditEvents({ rows, admin }: { rows: AuditRow[]; admin: boolean }) {
  return (
    <div className="chart-card">
      <div className="chart-head">
        <div>
          <div className="chart-title">監査・コンプライアンス</div>
          <div className="chart-sub">直近の重要イベント</div>
        </div>
        {admin && (
          <Link href="/audit" className="chart-link">
            すべて表示 →
          </Link>
        )}
      </div>
      <div className="audit-list">
        {rows.length === 0 ? (
          <div className="audit-empty">記録された重要イベントはまだありません</div>
        ) : (
          rows.map((row) => {
            const display = ACTION_DISPLAY[row.action] ?? {
              icon: 'doc' as const,
              jp: row.action,
              tone: 'ok' as const,
            };
            return (
              <div key={row.id} className={`audit-row ${display.tone === 'warn' ? 'warn' : ''}`}>
                <div className="ico">
                  <Icon name={display.icon} size={13} />
                </div>
                <div>
                  <div className="title">{display.jp}</div>
                  <div className="sub">
                    {formatRelativeTime(row.createdAt)} · {summarise(row)}
                  </div>
                </div>
                <Icon name={display.tone === 'warn' ? 'alert' : 'check'} size={13} stroke={2} />
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

function summarise(row: AuditRow): string {
  const meta = row.metadata;
  if (!meta || typeof meta !== 'object' || Array.isArray(meta)) return row.action;
  const m = meta as Record<string, unknown>;
  if (row.action === 'knowledge.updated') {
    if (typeof m.flagged === 'number') return `${m.flagged}件をフラグ`;
    if (typeof m.source === 'string') return String(m.source);
  }
  if (row.action === 'channel.configured' && typeof m.channelType === 'string') {
    return `${m.channelType} ${m.enabled ? '有効' : '無効'}`;
  }
  if (row.action === 'client.identity_linked' && typeof m.channel === 'string') {
    return `${m.channel} ユーザーを紐付け`;
  }
  return row.action;
}
