import { getPrismaClient } from '../../infrastructure/database';
import { Prisma } from '@prisma/client';

export interface OutboxEntryInput {
  eventType: string;
  payload: Record<string, unknown>;
  aggregateId: string;
}

export class OutboxService {
  static async enqueue(input: OutboxEntryInput): Promise<string> {
    const prisma = getPrismaClient();
    const row = await prisma.outbox.create({
      data: {
        eventType: input.eventType,
        payload: input.payload as Prisma.InputJsonValue,
        aggregateId: input.aggregateId,
        status: 'pending',
      },
    });
    return row.id;
  }

  static async fetchPending(limit = 100): Promise<
    Array<{
      id: string;
      eventType: string;
      payload: unknown;
      aggregateId: string;
      retryCount: number;
    }>
  > {
    const prisma = getPrismaClient();
    return prisma.outbox.findMany({
      where: { status: 'pending' },
      orderBy: { createdAt: 'asc' },
      take: limit,
    });
  }

  static async markDispatched(id: string): Promise<void> {
    const prisma = getPrismaClient();
    await prisma.outbox.update({
      where: { id },
      data: { status: 'dispatched', processedAt: new Date() },
    });
  }

  static async markFailed(id: string): Promise<void> {
    const prisma = getPrismaClient();
    await prisma.outbox.update({
      where: { id },
      data: { retryCount: { increment: 1 }, status: 'failed' },
    });
  }
}
