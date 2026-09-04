import { PrismaClient } from '@prisma/client';

let prisma: PrismaClient | null = null;

/**
 * Get or create Prisma client
 */
export function getPrismaClient(): PrismaClient {
  if (prisma) {
    return prisma;
  }

  prisma = new PrismaClient({ errorFormat: 'pretty' });

  return prisma;
}

/**
 * Disconnect Prisma client
 */
export async function disconnectPrisma(): Promise<void> {
  if (prisma) {
    await prisma.$disconnect();
    prisma = null;
  }
}
