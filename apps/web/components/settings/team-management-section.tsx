import type { FirmUser } from '@zeiro/db';
import type { PendingInvitation } from '@/lib/team';
import { InviteMemberForm } from './invite-member-form';
import { MemberList } from './member-list';
import { PendingInvitations } from './pending-invitations';

type Props = {
  members: FirmUser[];
  invitations: PendingInvitation[];
  currentClerkUserId: string;
};

export function TeamManagementSection({ members, invitations, currentClerkUserId }: Props) {
  return (
    <section
      style={{
        background: 'var(--surface)',
        border: '1px solid var(--line)',
        borderRadius: 14,
        padding: '1.5rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '1.25rem',
      }}
    >
      <header>
        <h2 style={{ fontFamily: 'var(--font-sans)', fontSize: 16, fontWeight: 600, margin: 0 }}>
          メンバー管理
        </h2>
        <p style={{ color: 'var(--muted)', fontSize: 13, marginTop: 6, lineHeight: 1.7 }}>
          事務所のメンバーを招待・管理します。所長は他のメンバーを管理者に昇格させたり、削除することができます。
        </p>
      </header>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <SectionLabel>現在のメンバー ({members.length}名)</SectionLabel>
        <MemberList members={members} currentClerkUserId={currentClerkUserId} />
      </div>

      {invitations.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <SectionLabel>未承諾の招待 ({invitations.length}件)</SectionLabel>
          <PendingInvitations invitations={invitations} />
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <SectionLabel>新しいメンバーを招待</SectionLabel>
        <InviteMemberForm />
      </div>
    </section>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        fontFamily: 'var(--font-mono)',
        fontSize: 9.5,
        color: 'var(--muted-2)',
        textTransform: 'uppercase',
        letterSpacing: '0.12em',
      }}
    >
      {children}
    </div>
  );
}
