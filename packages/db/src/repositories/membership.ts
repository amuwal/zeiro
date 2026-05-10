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
