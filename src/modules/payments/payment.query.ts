import { Prisma } from '@prisma/client';
import { getPrismaClient } from '@/src/infrastructure/database';

export const paymentDetailInclude = Prisma.validator<Prisma.PaymentInclude>()({
  order: true,
  attempts: { orderBy: { createdAt: 'asc' } },
  recovery: true,
  auditLogs: { orderBy: { createdAt: 'asc' } },
  agentDecisions: {
    orderBy: { createdAt: 'desc' },
    include: { approval: true },
  },
});

export type PaymentDetail = Prisma.PaymentGetPayload<{
  include: typeof paymentDetailInclude;
}>;

export function getPaymentById(id: string): Promise<PaymentDetail | null> {
  return getPrismaClient().payment.findUnique({
    where: { id },
    include: paymentDetailInclude,
  });
}
