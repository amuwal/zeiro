import { PrismaNeon } from '@prisma/adapter-neon';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';

let cached: PrismaClient | undefined;

export function getPrisma(): PrismaClient {
  if (cached) return cached;
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL missing');

  const adapter = isNeon(url)
    ? new PrismaNeon({ connectionString: url })
    : new PrismaPg({ connectionString: url });
  cached = new PrismaClient({ adapter });
  return cached;
}

function isNeon(url: string): boolean {
  return url.includes('.neon.tech');
}
