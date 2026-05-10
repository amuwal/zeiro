import { type Membership, Prisma } from '@prisma/client';
import { getPrisma } from '../server';

type UpsertInput = {
  userId: string;
  firmId: string;
  role: string;
};

export function getMembership(userId: string, firmId: string) {
  return getPrisma().membership.findUnique({
    where: { userId_firmId: { userId, firmId } },
  });
}

export async function upsertMembership(input: UpsertInput): Promise<Membership> {
  return getPrisma().membership.upsert({
    where: { userId_firmId: { userId: input.userId, firmId: input.firmId } },
    update: { role: input.role },
    create: input,
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
    joinedAt: r.createdAt,
  }));
}

export async function countAdmins(firmId: string): Promise<number> {
  return getPrisma().membership.count({
    where: { firmId, role: { contains: 'admin' } },
  });
}
