import { type Membership, Prisma } from '@prisma/client';
import { getPrisma } from '../server';

type UpsertInput = {
  userId: string;
  firmId: string;
  role: string;
  tier?: string;
};

export function getMembership(userId: string, firmId: string) {
  return getPrisma().membership.findUnique({
    where: { userId_firmId: { userId, firmId } },
  });
}

export async function upsertMembership(input: UpsertInput): Promise<Membership> {
  const update: { role: string; tier?: string } = { role: input.role };
  const create: { userId: string; firmId: string; role: string; tier?: string } = {
    userId: input.userId,
    firmId: input.firmId,
    role: input.role,
  };
  if (input.tier) {
    update.tier = input.tier;
    create.tier = input.tier;
  }
  return getPrisma().membership.upsert({
    where: { userId_firmId: { userId: input.userId, firmId: input.firmId } },
    update,
    create,
  });
}

export async function removeMembership(userId: string, firmId: string): Promise<void> {
  try {
    await getPrisma().membership.delete({
      where: { userId_firmId: { userId, firmId } },
    });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2025') return;
    throw e;
  }
}

export function listMembershipsByUser(userId: string) {
  return getPrisma().membership.findMany({
    where: { userId },
    include: { firm: true },
  });
}

export async function findAdminUserId(firmId: string): Promise<string | null> {
  const m = await getPrisma().membership.findFirst({
    where: { firmId, role: { contains: 'admin' } },
    select: { userId: true },
    orderBy: { createdAt: 'asc' },
  });
  return m?.userId ?? null;
}

export type FirmUser = {
  id: string;
  clerkUserId: string;
  name: string;
  email: string;
  role: string;
  tier: string;
  supervisorId: string | null;
  joinedAt: Date;
};

export async function listFirmUsers(firmId: string): Promise<FirmUser[]> {
  const rows = await getPrisma().membership.findMany({
    where: { firmId },
    include: {
      user: { select: { id: true, clerkUserId: true, name: true, email: true } },
    },
    orderBy: { createdAt: 'asc' },
  });
  return rows.map((r) => ({
    id: r.user.id,
    clerkUserId: r.user.clerkUserId,
    name: r.user.name,
    email: r.user.email,
    role: r.role,
    tier: r.tier,
    supervisorId: r.supervisorId,
    joinedAt: r.createdAt,
  }));
}

export async function countAdmins(firmId: string): Promise<number> {
  return getPrisma().membership.count({
    where: { firmId, role: { contains: 'admin' } },
  });
}

// Mutates only the `tier` column. Clerk role stays untouched. Authorization
// is enforced in the calling server action, not here.
export async function setMembershipTier(input: {
  firmId: string;
  userId: string;
  tier: string;
}): Promise<void> {
  await getPrisma().membership.update({
    where: { userId_firmId: { userId: input.userId, firmId: input.firmId } },
    data: { tier: input.tier },
  });
}

// `supervisorId` of null clears the edge (top-of-tree). Authorization,
// cycle prevention, and same-firm validation belong in the caller.
export async function setMembershipSupervisor(input: {
  firmId: string;
  userId: string;
  supervisorId: string | null;
}): Promise<void> {
  await getPrisma().membership.update({
    where: { userId_firmId: { userId: input.userId, firmId: input.firmId } },
    data: { supervisorId: input.supervisorId },
  });
}

// Walks the supervisor chain starting from `fromUserId`. The first
// firm-member ancestor is the escalation target. Falls back to the oldest
// admin so escalation never produces null in a firm that has any admin.
export async function findEscalationTarget(
  firmId: string,
  fromUserId: string | null,
): Promise<string | null> {
  if (fromUserId) {
    const visited = new Set<string>();
    let cursor = fromUserId;
    for (let i = 0; i < 16; i++) {
      if (visited.has(cursor)) break;
      visited.add(cursor);
      const row = await getPrisma().membership.findFirst({
        where: { firmId, userId: cursor },
        select: { supervisorId: true },
      });
      if (!row?.supervisorId) break;
      const sup = await getPrisma().membership.findFirst({
        where: { firmId, userId: row.supervisorId },
        select: { userId: true },
      });
      if (sup) return sup.userId;
      cursor = row.supervisorId;
    }
  }
  return findAdminUserId(firmId);
}

// Returns true if setting `userId`'s supervisor to `candidateSupervisorId`
// would create a cycle.
export async function wouldCreateSupervisorCycle(
  firmId: string,
  userId: string,
  candidateSupervisorId: string,
): Promise<boolean> {
  if (userId === candidateSupervisorId) return true;
  const visited = new Set<string>();
  let cursor: string | null = candidateSupervisorId;
  for (let i = 0; i < 32; i++) {
    if (!cursor || visited.has(cursor)) return false;
    if (cursor === userId) return true;
    visited.add(cursor);
    const row: { supervisorId: string | null } | null = await getPrisma().membership.findFirst({
      where: { firmId, userId: cursor },
      select: { supervisorId: true },
    });
    cursor = row?.supervisorId ?? null;
  }
  return false;
}

// Tree shape for the settings UI: flat list (already ordered by joinedAt),
// each row carrying its direct-subordinate count.
export type FirmTreeNode = FirmUser & {
  subordinates: number;
};

export async function listFirmTree(firmId: string): Promise<FirmTreeNode[]> {
  const users = await listFirmUsers(firmId);
  const counts = new Map<string, number>();
  for (const u of users) {
    if (u.supervisorId) counts.set(u.supervisorId, (counts.get(u.supervisorId) ?? 0) + 1);
  }
  return users.map((u) => ({ ...u, subordinates: counts.get(u.id) ?? 0 }));
}
