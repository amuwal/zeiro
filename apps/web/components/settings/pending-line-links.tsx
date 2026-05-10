'use client';

import { useActionState } from 'react';
import { type LinkLineState, linkLineUserId } from '@/app/(app)/settings/actions';

const initial: LinkLineState = { error: null, linked: null };

export type PendingLink = {
  lineUserId: string;
  count: number;
  lastSeen: Date;
};

export type ClientOption = {
  id: string;
  name: string;
  lineUserId: string | null;
};

type Props = {
  pending: PendingLink[];
  clients: ClientOption[];
};

export function PendingLineLinks({ pending, clients }: Props) {
  if (pending.length === 0) {
    return (
      <div style={{ color: 'var(--muted)', fontSize: 12.5 }}>
        未紐付けの LINE ユーザーはありません。
      </div>
    );
  }

  const unlinkedClients = clients.filter((c) => !c.lineUserId);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div className="kb-row head" style={{ gridTemplateColumns: '1fr 80px 120px 1fr 100px' }}>
        <div>LINE USER ID</div>
        <div>件数</div>
        <div>最終受信</div>
        <div>顧問先</div>
        <div>操作</div>
      </div>
      {pending.map((p) => (
        <PendingLinkRow key={p.lineUserId} pending={p} clients={unlinkedClients} />
      ))}
    </div>
  );
}

function PendingLinkRow({ pending, clients }: { pending: PendingLink; clients: ClientOption[] }) {
  const [state, action, isPending] = useActionState(linkLineUserId, initial);
  const linked = state.linked === pending.lineUserId;

  return (
    <form
      action={action}
      className="kb-row"
      style={{
        gridTemplateColumns: '1fr 80px 120px 1fr 100px',
        opacity: linked ? 0.6 : 1,
      }}
    >
      <input type="hidden" name="lineUserId" value={pending.lineUserId} />
      <code
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 11.5,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
        title={pending.lineUserId}
      >
        {pending.lineUserId}
      </code>
      <div className="uses">{pending.count}</div>
      <div className="updated">
        {pending.lastSeen.toLocaleDateString('ja-JP', { month: 'short', day: 'numeric' })}
      </div>
      <select
        name="clientId"
        required
        disabled={linked || isPending || clients.length === 0}
        defaultValue=""
        style={selectStyle}
      >
        <option value="" disabled>
          {clients.length === 0 ? '紐付け可能な顧問先なし' : '選択してください'}
        </option>
        {clients.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
      </select>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <button
          type="submit"
          className="btn btn-secondary"
          disabled={linked || isPending || clients.length === 0}
          style={{ fontSize: 12, padding: '6px 10px' }}
        >
          {linked ? '紐付け済' : isPending ? '処理中…' : '紐付け'}
        </button>
        {state.error && !linked && (
          <span style={{ color: 'var(--urgent)', fontSize: 10.5 }}>{state.error}</span>
        )}
      </div>
    </form>
  );
}

const selectStyle: React.CSSProperties = {
  padding: '6px 8px',
  border: '1px solid var(--line)',
  borderRadius: 6,
  background: 'var(--surface)',
  fontSize: 12.5,
  outline: 'none',
};
