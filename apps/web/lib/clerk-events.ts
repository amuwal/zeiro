import {
  findFirmByClerkOrgId,
  findUserByClerkUserId,
  removeMembership,
  upsertFirmFromClerk,
  upsertMembership,
  upsertUser,
} from '@zeiro/db';
import { z } from 'zod';

const userPayload = z.object({
  id: z.string(),
  email_addresses: z.array(z.object({ email_address: z.string().email() })).min(1),
  first_name: z.string().nullable().optional(),
  last_name: z.string().nullable().optional(),
});

const orgPayload = z.object({
  id: z.string(),
  name: z.string(),
  slug: z.string().nullable().optional(),
});

const membershipPayload = z.object({
  organization: z.object({
    id: z.string(),
    name: z.string(),
    slug: z.string().nullable().optional(),
  }),
  public_user_data: z.object({
    user_id: z.string(),
    identifier: z.string().email(),
    first_name: z.string().nullable().optional(),
    last_name: z.string().nullable().optional(),
  }),
  role: z.string(),
});

export type ClerkEvent = { type: string; data: unknown };

export async function applyClerkEvent(event: ClerkEvent): Promise<void> {
  switch (event.type) {
    case 'user.created':
    case 'user.updated':
      await onUserUpserted(event.data);
      return;

    case 'organization.created':
    case 'organization.updated':
      await onOrgUpserted(event.data);
      return;

    case 'organizationMembership.created':
    case 'organizationMembership.updated':
      await onMembershipUpserted(event.data);
      return;

    case 'organizationMembership.deleted':
      await onMembershipRemoved(event.data);
      return;
  }
}

async function onUserUpserted(data: unknown): Promise<void> {
  const u = userPayload.parse(data);
  const primaryEmail = u.email_addresses[0]?.email_address;
  if (!primaryEmail) return;
  await upsertUser({
    clerkUserId: u.id,
    email: primaryEmail,
    name: composeName(u.first_name, u.last_name) || primaryEmail,
  });
}

async function onOrgUpserted(data: unknown): Promise<void> {
  const o = orgPayload.parse(data);
  await upsertFirmFromClerk({
    clerkOrgId: o.id,
    name: o.name,
    inboundAddress: defaultInboundAddress(o.slug ?? o.id),
  });
}

async function onMembershipUpserted(data: unknown): Promise<void> {
  const m = membershipPayload.parse(data);

  const user = await upsertUser({
    clerkUserId: m.public_user_data.user_id,
    email: m.public_user_data.identifier,
    name:
      composeName(m.public_user_data.first_name, m.public_user_data.last_name) ||
      m.public_user_data.identifier,
  });
  const firm = await upsertFirmFromClerk({
    clerkOrgId: m.organization.id,
    name: m.organization.name,
    inboundAddress: defaultInboundAddress(m.organization.slug ?? m.organization.id),
  });

  await upsertMembership({ userId: user.id, firmId: firm.id, role: m.role });
}

async function onMembershipRemoved(data: unknown): Promise<void> {
  const m = membershipPayload.parse(data);
  const [user, firm] = await Promise.all([
    findUserByClerkUserId(m.public_user_data.user_id),
    findFirmByClerkOrgId(m.organization.id),
  ]);
  if (!user || !firm) return;
  await removeMembership(user.id, firm.id);
}

function composeName(first?: string | null, last?: string | null): string {
  return [first, last].filter(Boolean).join(' ').trim();
}

function defaultInboundAddress(slug: string): string {
  return `inquiry-${slug.toLowerCase().replace(/[^a-z0-9-]/g, '-')}@reply.zeiro.jp`;
}
