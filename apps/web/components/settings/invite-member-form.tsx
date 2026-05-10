'use client';

import { useActionState } from 'react';
import { initialTeamState, inviteMember } from '@/app/(app)/settings/team-actions';

export function InviteMemberForm() {
  const [state, action, pending] = useActionState(inviteMember, initialTeamState);

  return (
    <form
      action={action}
      style={{
        display: 'grid',
        gridTemplateColumns: '1fr 200px auto',
        gap: 10,
        alignItems: 'end',
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <label htmlFor="invite-email" style={labelStyle}>
          メールアドレス
        </label>
        <input
          id="invite-email"
          name="email"
          type="email"
          required
          placeholder="member@example.com"
          style={inputStyle}
        />
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <label htmlFor="invite-role" style={labelStyle}>
          役割
        </label>
        <select id="invite-role" name="role" defaultValue="org:member" style={inputStyle}>
          <option value="org:member">メンバー</option>
          <option value="org:admin">所長 (管理者)</option>
        </select>
      </div>

      <button type="submit" className="btn btn-primary" disabled={pending}>
        {pending ? '送信中…' : '招待を送信'}
      </button>

      {state.status === 'error' && (
        <div style={{ gridColumn: '1 / -1', color: 'var(--urgent)', fontSize: 12 }}>
          {state.message}
        </div>
      )}
      {state.status === 'success' && (
        <div style={{ gridColumn: '1 / -1', color: 'var(--positive)', fontSize: 12 }}>
          {state.message}
        </div>
      )}
    </form>
  );
}

const labelStyle: React.CSSProperties = {
  fontSize: 11,
  color: 'var(--muted-2)',
  fontFamily: 'var(--font-mono)',
  textTransform: 'uppercase',
  letterSpacing: '0.1em',
};

const inputStyle: React.CSSProperties = {
  padding: '8px 10px',
  border: '1px solid var(--line)',
  borderRadius: 8,
  background: 'var(--surface)',
  fontSize: 13,
  outline: 'none',
};
