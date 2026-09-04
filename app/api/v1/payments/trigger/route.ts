/**
 * Demo trigger endpoint — creates an order + payment + runs the full AI pipeline
 * for a given scenario. Used for the demo UI "Trigger Payment" button.
 */
import { NextRequest, NextResponse } from 'next/server';
import { requireApiKey } from '@/src/infrastructure/api';
import { apiError } from '@/src/infrastructure/http';
import { PaymentService } from '@/src/modules/payments/payment.service';
import { diagnoseFailedPayment } from '@/src/workers/diagnosis.worker';
import { MockPaymentProvider } from '@/src/modules/providers/payment-provider';
import { z } from 'zod';

const schema = z.object({
  merchantId: z.string().default('demo-merchant'),
  amount: z.number().positive().default(1000),
  currency: z.string().default('INR'),
  scenario: z.enum(['TRANSIENT_NETWORK', 'GATEWAY_TIMEOUT', 'BANK_TEMPORARY_FAILURE', 'INSUFFICIENT_FUNDS', 'CARD_DECLINED', 'UNKNOWN', 'SUCCESS']).default('GATEWAY_TIMEOUT'),
});

export async function POST(req: NextRequest) {
  const denied = requireApiKey(req);
  if (denied) return denied;
  try {
    const body = schema.parse(await req.json());

    // 1. Create order
    const order = await PaymentService.createOrder(body.merchantId, body.amount, body.currency);

    // 2. Execute payment with mock provider using the scenario
    const provider = new MockPaymentProvider();
    const result = await PaymentService.createPayment(order.id, 'mock', body.scenario, provider);

    // 3. If failed, run AI diagnosis pipeline
    if (!result.success) {
      await diagnoseFailedPayment(result.paymentId);
    }

    // 4. Return full state
    const { getPrismaClient } = await import('@/src/infrastructure/database');
    const payment = await getPrismaClient().payment.findUnique({
      where: { id: result.paymentId },
      include: {
        order: true,
        attempts: true,
        agentDecisions: { include: { approval: true } },
      },
    });

    return NextResponse.json({ payment }, { status: 201 });
  } catch (e) {
    return apiError('TRIGGER_FAILED', e instanceof Error ? e.message : 'Trigger failed', 500);
  }
}
