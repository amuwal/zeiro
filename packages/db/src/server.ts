import { PrismaNeon } from '@prisma/adapter-neon';
import { PrismaClient } from '@prisma/client';

let cached: PrismaClient | undefined;

export function getPrisma(): PrismaClient {
  if (cached) return cached;
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL missing');

  cached = isNeon(url)
    ? new PrismaClient({ adapter: new PrismaNeon({ connectionString: url }) })
    : new PrismaClient();
  return cached;
}

function isNeon(url: string): boolean {
  return url.includes('.neon.tech');
}
