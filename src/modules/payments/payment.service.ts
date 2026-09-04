import { Prisma, type PaymentStatus } from '@prisma/client';
import { getPrismaClient } from '@/src/infrastructure/database';
import { assertPaymentTransition } from './state-machine';
import { postBalancedLedger } from '../ledger/ledger.service';
import { MockPaymentProvider, type PaymentProvider } from '../providers/payment-provider';

export class PaymentService {
  static async createOrder(merchantId: string, amount: number, currency = 'INR') { return getPrismaClient().order.create({ data: { merchantId, amount: new Prisma.Decimal(amount), currency } }); }
  static async createPayment(orderId: string, provider = 'mock', scenario?: string, executor: PaymentProvider = new MockPaymentProvider()) {
    const prisma = getPrismaClient();
    const payment = await prisma.payment.create({ data: { orderId, provider } });
    return this.attempt(payment.id, scenario, executor);
  }
  static async transition(paymentId: string, to: PaymentStatus) {
    const prisma = getPrismaClient(); const payment = await prisma.payment.findUniqueOrThrow({ where: { id: paymentId } });
    assertPaymentTransition(payment.status, to); return prisma.payment.update({ where: { id: paymentId }, data: { status: to } });
  }
  static async attempt(paymentId: string, scenario?: string, executor: PaymentProvider = new MockPaymentProvider()) {
    const prisma = getPrismaClient(); const payment = await prisma.payment.findUniqueOrThrow({ where: { id: paymentId }, include: { order: true, attempts: true } });
    const entering = payment.status === 'CREATED' ? 'ATTEMPTED' : 'RETRYING'; await this.transition(paymentId, entering);
    const result = await executor.execute({ paymentId, scenario });
    const next = result.success ? 'SUCCESS' : 'FAILED';
    return prisma.$transaction(async tx => {
      const attemptNo = payment.attempts.length + 1;
      await tx.paymentAttempt.create({ data: { paymentId, attemptNumber: attemptNo, outcome: result.success ? 'SUCCESS' : 'FAILED', gatewayErrorCode: result.errorCode } });
      if (result.success) {
        const merchantAccount = await tx.ledgerAccount.upsert({ where: { ownerType_ownerId: { ownerType: 'MERCHANT', ownerId: payment.order.merchantId } }, create: { ownerType: 'MERCHANT', ownerId: payment.order.merchantId }, update: {} });
        const clearingAccount = await tx.ledgerAccount.upsert({ where: { ownerType_ownerId: { ownerType: 'CLEARING', ownerId: 'platform' } }, create: { ownerType: 'CLEARING', ownerId: 'platform' }, update: {} });
        await postBalancedLedger(tx, paymentId, payment.order.amount, clearingAccount.id, merchantAccount.id);
      }
      await tx.payment.update({ where: { id: paymentId }, data: { status: next, retryCount: entering === 'RETRYING' ? { increment: 1 } : undefined, failureReason: result.error ?? null } });
      await tx.outboxEvent.create({ data: { aggregateType: 'payment', aggregateId: paymentId, eventType: result.success ? 'payment.success' : 'payment.failed', payload: { paymentId, errorCode: result.errorCode ?? null } } });
      return { paymentId, success: result.success, status: next, errorCode: result.errorCode };
    });
  }
}
