import { Prisma, type PaymentStatus } from '@prisma/client';
import { getPrismaClient } from '@/src/infrastructure/database';
import { assertPaymentTransition } from './state-machine';
import { postBalancedLedger } from '../ledger/ledger.service';
import { getPaymentProvider, type PaymentProvider } from '../providers/payment-provider';

export class PaymentService {
  static async createOrder(merchantId: string, amount: number, currency = 'INR') {
    return getPrismaClient().order.create({
      data: { merchantId, amount: new Prisma.Decimal(amount), currency },
    });
  }
  static async createPayment(
    orderId: string,
    provider = 'mock',
    scenario?: string,
    executor: PaymentProvider = getPaymentProvider(),
  ) {
    const prisma = getPrismaClient();
    const payment = await prisma.payment.create({ data: { orderId, provider } });
    return this.attempt(payment.id, scenario, executor);
  }
  static async attachGatewayOrder(orderId: string, gatewayOrderId: string) {
    const prisma = getPrismaClient();
    return prisma.$transaction([
      prisma.order.update({ where: { id: orderId }, data: { gatewayOrderId } }),
      prisma.payment.updateMany({
        where: { orderId, status: 'CREATED' },
        data: { gatewayPaymentId: null, razorpayOrderId: gatewayOrderId },
      }),
    ]);
  }

  static async createCheckoutPayment(orderId: string, provider: PaymentProvider) {
    return getPrismaClient().payment.create({
      data: { orderId, provider: provider.name.toLowerCase(), checkoutStatus: 'INITIALIZED' },
    });
  }

  static async recordCheckoutFailure(paymentId: string, status: 'PAYMENT_FAILED' | 'PAYMENT_ABANDONED', reason: string) {
    const prisma = getPrismaClient();
    const payment = await prisma.payment.findUniqueOrThrow({ where: { id: paymentId } });
    if (payment.status === 'SUCCESS' || payment.status === 'FAILED') return payment;
    if (payment.status === 'CREATED') await this.transition(paymentId, 'ATTEMPTED');
    await this.transition(paymentId, 'FAILED');
    return prisma.$transaction(async (tx) => {
      const attemptNumber = (await tx.paymentAttempt.count({ where: { paymentId } })) + 1;
      await tx.paymentAttempt.create({
        data: { paymentId, attemptNumber, outcome: 'FAILED', gatewayErrorCode: status },
      });
      await tx.outboxEvent.create({
        data: { aggregateType: 'payment', aggregateId: paymentId, eventType: 'payment.failed', payload: { paymentId, status, reason } },
      });
      return tx.payment.update({ where: { id: paymentId }, data: { checkoutStatus: status, failureReason: reason } });
    });
  }

  static async recordCapturedPayment(
    orderId: string,
    gatewayPaymentId: string,
    provider: string,
    gatewayOrderId?: string,
    signature?: string,
  ) {
    const prisma = getPrismaClient();
    const existing = await prisma.payment.findFirst({
      where: { OR: [{ gatewayPaymentId }, { razorpayPaymentId: gatewayPaymentId }] },
    });
    if (existing) return existing;
    const payment = await prisma.payment.findFirst({
      // A failed checkout is an immutable audit record. Never transition it back
      // to ATTEMPTED when a later checkout for the same order succeeds.
      where: { orderId, status: 'CREATED' },
      orderBy: { createdAt: 'desc' },
    });
    const paymentRecord = payment
      ? await prisma.payment.update({
          where: { id: payment.id },
          data: { provider, gatewayPaymentId, razorpayPaymentId: gatewayPaymentId, razorpayOrderId: gatewayOrderId, razorpaySignature: signature },
        })
      : await prisma.payment.create({
          data: { orderId, provider, gatewayPaymentId, razorpayPaymentId: gatewayPaymentId, razorpayOrderId: gatewayOrderId, razorpaySignature: signature },
        });
    await this.transition(paymentRecord.id, 'ATTEMPTED');
    return prisma.$transaction(async (tx) => {
      const order = await tx.order.findUniqueOrThrow({ where: { id: orderId } });
      const merchantAccount = await tx.ledgerAccount.upsert({
        where: { ownerType_ownerId: { ownerType: 'MERCHANT', ownerId: order.merchantId } },
        create: { ownerType: 'MERCHANT', ownerId: order.merchantId }, update: {},
      });
      const clearingAccount = await tx.ledgerAccount.upsert({
        where: { ownerType_ownerId: { ownerType: 'CLEARING', ownerId: 'platform' } },
        create: { ownerType: 'CLEARING', ownerId: 'platform' }, update: {},
      });
      await tx.paymentAttempt.create({
        data: { paymentId: paymentRecord.id, attemptNumber: 1, outcome: 'SUCCESS' },
      });
      await postBalancedLedger(tx, paymentRecord.id, order.amount, clearingAccount.id, merchantAccount.id);
      const updated = await tx.payment.update({ where: { id: paymentRecord.id }, data: { status: 'SUCCESS', checkoutStatus: 'CAPTURED', verifiedAt: new Date() } });
      await tx.outboxEvent.create({
        data: {
          aggregateType: 'payment',
          aggregateId: paymentRecord.id,
          eventType: 'payment.success',
          payload: { paymentId: paymentRecord.id, gatewayPaymentId },
        },
      });
      return updated;
    });
  }
  static async transition(paymentId: string, to: PaymentStatus) {
    const prisma = getPrismaClient();
    const payment = await prisma.payment.findUniqueOrThrow({ where: { id: paymentId } });
    assertPaymentTransition(payment.status, to);
    return prisma.payment.update({ where: { id: paymentId }, data: { status: to } });
  }
  static async attempt(
    paymentId: string,
    scenario?: string,
    executor: PaymentProvider = getPaymentProvider(),
  ) {
    const prisma = getPrismaClient();
    const payment = await prisma.payment.findUniqueOrThrow({
      where: { id: paymentId },
      include: { order: true, attempts: true },
    });
    const entering = payment.status === 'CREATED' ? 'ATTEMPTED' : 'RETRYING';
    await this.transition(paymentId, entering);
    const result = await executor.execute({ paymentId, scenario });
    const next = result.success ? 'SUCCESS' : 'FAILED';
    return prisma.$transaction(async (tx) => {
      const attemptNo = payment.attempts.length + 1;
      await tx.paymentAttempt.create({
        data: {
          paymentId,
          attemptNumber: attemptNo,
          outcome: result.success ? 'SUCCESS' : 'FAILED',
          gatewayErrorCode: result.errorCode,
        },
      });
      if (result.success) {
        const merchantAccount = await tx.ledgerAccount.upsert({
          where: {
            ownerType_ownerId: { ownerType: 'MERCHANT', ownerId: payment.order.merchantId },
          },
          create: { ownerType: 'MERCHANT', ownerId: payment.order.merchantId },
          update: {},
        });
        const clearingAccount = await tx.ledgerAccount.upsert({
          where: { ownerType_ownerId: { ownerType: 'CLEARING', ownerId: 'platform' } },
          create: { ownerType: 'CLEARING', ownerId: 'platform' },
          update: {},
        });
        await postBalancedLedger(
          tx,
          paymentId,
          payment.order.amount,
          clearingAccount.id,
          merchantAccount.id,
        );
      }
      await tx.payment.update({
        where: { id: paymentId },
        data: {
          status: next,
          retryCount: entering === 'RETRYING' ? { increment: 1 } : undefined,
          failureReason: result.error ?? null,
        },
      });
      await tx.outboxEvent.create({
        data: {
          aggregateType: 'payment',
          aggregateId: paymentId,
          eventType: result.success ? 'payment.success' : 'payment.failed',
          payload: { paymentId, errorCode: result.errorCode ?? null },
        },
      });
      return { paymentId, success: result.success, status: next, errorCode: result.errorCode };
    });
  }
}
