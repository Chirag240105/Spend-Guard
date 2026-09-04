import { NextRequest, NextResponse } from 'next/server';
import { createHmac } from 'crypto';
import { requireApiKey } from '@/src/infrastructure/api';
import { apiError } from '@/src/infrastructure/http';
import { PaymentService } from '@/src/modules/payments/payment.service';
import { getPrismaClient } from '@/src/infrastructure/database';
import { z } from 'zod';

const schema = z.object({
  razorpay_order_id: z.string(),
  razorpay_payment_id: z.string(),
  razorpay_signature: z.string(),
  internalOrderId: z.string(),
});

export async function POST(req: NextRequest) {
  const denied = requireApiKey(req);
  if (denied) return denied;
  try {
    const body = schema.parse(await req.json());
    const keySecret = process.env.RAZORPAY_KEY_SECRET;

    // Signature verification (skip in mock mode)
    if (keySecret) {
      const expectedSig = createHmac('sha256', keySecret)
        .update(`${body.razorpay_order_id}|${body.razorpay_payment_id}`)
        .digest('hex');
      if (expectedSig !== body.razorpay_signature) {
        return apiError('INVALID_SIGNATURE', 'Razorpay signature verification failed', 400);
      }
    }

    // Attach to internal order → create payment record → mark SUCCESS
    const payment = await getPrismaClient().payment.create({
      data: {
        orderId: body.internalOrderId,
        provider: keySecret ? 'razorpay' : 'mock',
        status: 'CREATED',
      },
    });

    // Directly mark as SUCCESS (signature verified = payment captured by Razorpay)
    await PaymentService.transition(payment.id, 'ATTEMPTED');
    await getPrismaClient().$transaction(async (tx) => {
      await tx.paymentAttempt.create({
        data: { paymentId: payment.id, attemptNumber: 1, outcome: 'SUCCESS' },
      });
      const order = await tx.order.findUniqueOrThrow({ where: { id: body.internalOrderId } });
      const merchantAccount = await tx.ledgerAccount.upsert({
        where: { ownerType_ownerId: { ownerType: 'MERCHANT', ownerId: order.merchantId } },
        create: { ownerType: 'MERCHANT', ownerId: order.merchantId },
        update: {},
      });
      const clearingAccount = await tx.ledgerAccount.upsert({
        where: { ownerType_ownerId: { ownerType: 'CLEARING', ownerId: 'platform' } },
        create: { ownerType: 'CLEARING', ownerId: 'platform' },
        update: {},
      });
      const { postBalancedLedger } = await import('@/src/modules/ledger/ledger.service');
      await postBalancedLedger(
        tx,
        payment.id,
        order.amount,
        clearingAccount.id,
        merchantAccount.id,
      );
      await tx.payment.update({ where: { id: payment.id }, data: { status: 'SUCCESS' } });
      await tx.outboxEvent.create({
        data: {
          aggregateType: 'payment',
          aggregateId: payment.id,
          eventType: 'payment.success',
          payload: { paymentId: payment.id, razorpayPaymentId: body.razorpay_payment_id },
        },
      });
    });

    return NextResponse.json({ ok: true, paymentId: payment.id, status: 'SUCCESS' });
  } catch (e) {
    return apiError('VERIFY_FAILED', e instanceof Error ? e.message : 'Verification failed', 500);
  }
}
