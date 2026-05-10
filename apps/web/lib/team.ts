import { clerkClient } from '@clerk/nextjs/server';

export type ClerkRole = 'org:admin' | 'org:member';

export type PendingInvitation = {
  id: string;
  emailAddress: string;
  role: ClerkRole;
  createdAt: Date;
};

export async function listPendingInvitations(organizationId: string): Promise<PendingInvitation[]> {
  const cc = await clerkClient();
  const result = await cc.organizations.getOrganizationInvitationList({
    organizationId,
    status: ['pending'],
  });
  return result.data.map((inv) => ({
    id: inv.id,
    emailAddress: inv.emailAddress,
    role: normaliseRole(inv.role),
    createdAt: new Date(inv.createdAt),
  }));
}

export function normaliseRole(role: string): ClerkRole {
  return role.toLowerCase().includes('admin') ? 'org:admin' : 'org:member';
}

export function isAdminRole(role: string): boolean {
  return role.toLowerCase().includes('admin');
}

export function roleLabel(role: ClerkRole): string {
  return role === 'org:admin' ? '所長 (管理者)' : 'メンバー';
}
