import type { User } from '@prisma/client';
import { getPrisma } from '../server';

type UpsertInput = {
  clerkUserId: string;
  email: string;
  name: string;
};

export function findUserByClerkUserId(clerkUserId: string) {
  return getPrisma().user.findUnique({ where: { clerkUserId } });
}

export function getUser(id: string) {
  return getPrisma().user.findUniqueOrThrow({ where: { id } });
}

export async function upsertUser(input: UpsertInput): Promise<User> {
  return getPrisma().user.upsert({
    where: { clerkUserId: input.clerkUserId },
    update: { email: input.email, name: input.name },
    create: {
      clerkUserId: input.clerkUserId,
      email: input.email,
      name: input.name,
    },
  });
}

export async function deleteUserByClerkUserId(clerkUserId: string): Promise<void> {
  await getPrisma().user.delete({ where: { clerkUserId } });
}
