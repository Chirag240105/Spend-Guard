import { PrismaClient } from '@prisma/client';

let prisma: PrismaClient | null = null;

/**
 * Get or create Prisma client
 */
export function getPrismaClient(): PrismaClient {
  if (prisma) {
    return prisma;
  }

  prisma = new PrismaClient({
    errorFormat: 'pretty',
  });

  if (process.env.NODE_ENV === 'development') {
    prisma.$on('query', (e) => {
      console.log('Query: ' + e.query);
      console.log('Params: ' + JSON.stringify(e.params));
      console.log('Duration: ' + e.duration + 'ms');
    });
  }

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
