import { clerkClient } from '@clerk/nextjs/server';
import { type PendingInvitation, normaliseRole } from './team';

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
