import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireApiKey } from '@/src/infrastructure/api';
import { PaymentService } from '@/src/modules/payments/payment.service';

const schema = z.object({
  paymentId: z.string().min(1),
  status: z.enum(['PAYMENT_FAILED', 'PAYMENT_ABANDONED']),
  reason: z.string().max(500).default('Checkout did not complete'),
});

export async function POST(req: NextRequest) {
  const denied = requireApiKey(req);
  if (denied) return denied;
  try {
    const body = schema.parse(await req.json());
    const payment = await PaymentService.recordCheckoutFailure(body.paymentId, body.status, body.reason);
    return NextResponse.json({ ok: true, paymentId: payment.id, checkoutStatus: payment.checkoutStatus });
  } catch (error) {
    return NextResponse.json({ code: 'CHECKOUT_FAILURE_RECORD_FAILED', message: error instanceof Error ? error.message : 'Unable to record checkout failure' }, { status: 400 });
  }
}
