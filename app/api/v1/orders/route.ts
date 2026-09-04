import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireApiKey } from '@/src/infrastructure/api';
import { apiError } from '@/src/infrastructure/http';
import {
  beginIdempotency,
  completeIdempotency,
} from '@/src/modules/idempotency/idempotency.service';
import { PaymentService } from '@/src/modules/payments/payment.service';
import { getPaymentProvider } from '@/src/modules/providers/payment-provider';
const bodySchema = z.object({
  merchantId: z.string().min(1),
  amount: z.number().positive(),
  currency: z.string().length(3).default('INR'),
  receipt: z.string().min(1).optional(),
  notes: z.record(z.string(), z.string()).optional(),
});
export async function POST(req: NextRequest) {
  const denied = requireApiKey(req);
  if (denied) return denied;
  const key = req.headers.get('idempotency-key');
  if (!key) return apiError('IDEMPOTENCY_KEY_REQUIRED', 'Idempotency-Key is required');
  try {
    const body = bodySchema.parse(await req.json());
    const idem = await beginIdempotency(key, 'POST:/v1/orders', body);
    if (idem.kind === 'existing')
      return NextResponse.json(
        idem.record.responseBody ?? { code: 'PROCESSING', message: 'Request is processing' },
        { status: idem.record.status === 'COMPLETED' ? 200 : 409 },
      );
    const provider = getPaymentProvider();
    const order = await PaymentService.createOrder(body.merchantId, body.amount, body.currency);
    const gatewayOrder = await provider.createOrder({
      amount: body.amount,
      currency: body.currency,
      receipt: body.receipt ?? `rcpt_${order.id}`,
      notes: body.notes,
    });
    await PaymentService.attachGatewayOrder(order.id, gatewayOrder.orderId);
    const response = {
      order: { ...order, gatewayOrderId: gatewayOrder.orderId },
      gatewayOrder,
      provider: provider.name,
      mode: provider.mode,
      keyId: process.env.RAZORPAY_KEY_ID ?? null,
    };
    await completeIdempotency(idem.record.id, response);
    return NextResponse.json(response, { status: 201 });
  } catch (e) {
    return apiError('ORDER_CREATE_FAILED', e instanceof Error ? e.message : 'Invalid order');
  }
}
