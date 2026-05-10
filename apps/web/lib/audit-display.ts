import type { IconName } from '@/components/ui/icon';

export type AuditDisplay = {
  icon: IconName;
  jp: string;
  tone: 'ok' | 'warn' | 'urgent' | 'info';
};

export const AUDIT_ACTION_DISPLAY: Record<string, AuditDisplay> = {
  'inquiry.received': { icon: 'inbox', jp: '問い合わせ受信', tone: 'info' },
  'inquiry.assigned': { icon: 'user', jp: '担当者割当', tone: 'info' },
  'draft.generated': { icon: 'edit', jp: '下書き生成', tone: 'info' },
  'draft.sent': { icon: 'send', jp: '下書き送信', tone: 'ok' },
  'draft.delivered': { icon: 'check', jp: '配信完了', tone: 'ok' },
  'draft.bounced': { icon: 'alert', jp: 'メール バウンス', tone: 'urgent' },
  'draft.spam_reported': { icon: 'alert', jp: 'スパム報告', tone: 'urgent' },
  'draft.rejected': { icon: 'x', jp: '下書き却下', tone: 'warn' },
  'draft.escalated': { icon: 'flag', jp: 'エスカレーション', tone: 'warn' },
  'knowledge.updated': { icon: 'doc', jp: 'ナレッジ更新', tone: 'info' },
  'client.tombstoned': { icon: 'archive', jp: '削除要求対応', tone: 'warn' },
  'client.identity_linked': { icon: 'users', jp: '顧問先 LINE 紐付け', tone: 'ok' },
  'channel.configured': { icon: 'settings', jp: 'チャネル設定', tone: 'info' },
};

const FALLBACK: AuditDisplay = { icon: 'doc', jp: '', tone: 'info' };

export function getAuditDisplay(action: string): AuditDisplay {
  return AUDIT_ACTION_DISPLAY[action] ?? { ...FALLBACK, jp: action };
}
