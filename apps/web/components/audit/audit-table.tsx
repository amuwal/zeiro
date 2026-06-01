import { SYSTEM_ACTOR_ID } from '@zeiro/core';
import type { AuditRow } from '@zeiro/db';
import Link from 'next/link';
import { Icon } from '@/components/ui/icon';
import { getAuditDisplay } from '@/lib/audit-display';
import { formatFullJST } from '@/lib/format';

type Props = {
  rows: AuditRow[];
  userById: Map<string, { id: string; name: string; email: string; role: string }>;
};

export function AuditTable({ rows, userById }: Props) {
  if (rows.length === 0) {
    return (
      <div className="audit-empty-card">
        条件に一致する監査ログはありません。フィルタを変更してください。
      </div>
    );
  }

  return (
    <div className="audit-table">
      <div className="audit-row head">
        <div>日時</div>
        <div>アクション</div>
        <div>実行者</div>
        <div>対象</div>
        <div>詳細</div>
      </div>
      {rows.map((row) => {
        const display = getAuditDisplay(row.action);
        const actor =
          row.actorId === SYSTEM_ACTOR_ID
            ? { name: 'システム', email: '' }
            : (userById.get(row.actorId) ?? { name: '(削除済み)', email: '' });
        return (
          <div key={row.id} className={`audit-row tone-${display.tone}`}>
            <div className="audit-time">{formatFullJST(row.createdAt)}</div>
            <div className="audit-action">
              <Icon name={display.icon} size={13} />
              <span>{display.jp}</span>
            </div>
            <div className="audit-actor">
              <div>{actor.name}</div>
              {actor.email && <div className="audit-mono">{actor.email}</div>}
            </div>
            <div>
              {row.inquiryId ? (
                <Link href={`/inbox/${row.inquiryId}`} className="audit-link">
                  問い合わせを開く
                </Link>
              ) : (
                <span className="audit-mono">—</span>
              )}
            </div>
            <div>
              <details>
                <summary className="audit-meta-summary">JSON</summary>
                <pre className="audit-meta">{prettyMetadata(row.metadata)}</pre>
              </details>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function prettyMetadata(meta: unknown): string {
  if (meta === null || meta === undefined) return '{}';
  try {
    return JSON.stringify(meta, null, 2);
  } catch {
    return String(meta);
  }
}
