import { NextRequest, NextResponse } from 'next/server';
import { requireApiKey } from '@/src/infrastructure/api';
import { apiError } from '@/src/infrastructure/http';
import { PaymentService } from '@/src/modules/payments/payment.service';
import { getPrismaClient } from '@/src/infrastructure/database';
import { beginIdempotency, completeIdempotency } from '@/src/modules/idempotency/idempotency.service';
import { z } from 'zod';
import { getPaymentProvider } from '@/src/modules/providers/payment-provider';

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
    const key = req.headers.get('idempotency-key');
    if (!key) return apiError('IDEMPOTENCY_KEY_REQUIRED', 'Idempotency-Key is required');
    const idem = await beginIdempotency(key, 'POST:/v1/razorpay/verify', body);
    if (idem.kind === 'existing') {
      return NextResponse.json(idem.record.responseBody ?? { code: 'PROCESSING' }, {
        status: idem.record.status === 'COMPLETED' ? 200 : 409,
      });
    }
    const provider = getPaymentProvider();
    if (!provider.verifyPaymentSignature({
      orderId: body.razorpay_order_id,
      paymentId: body.razorpay_payment_id,
      signature: body.razorpay_signature,
    })) {
      return apiError('INVALID_SIGNATURE', 'Razorpay signature verification failed', 400);
    }

    const order = await getPrismaClient().order.findUnique({ where: { id: body.internalOrderId } });
    if (!order || (provider.mode === 'razorpay-test' && order.gatewayOrderId !== body.razorpay_order_id)) {
      return apiError('ORDER_MISMATCH', 'Gateway order does not match the internal order', 400);
    }
    const payment = await PaymentService.recordCapturedPayment(
      body.internalOrderId,
      body.razorpay_payment_id,
      provider.name.toLowerCase(),
      body.razorpay_order_id,
      body.razorpay_signature,
    );
    const response = { ok: true, paymentId: payment.id, status: payment.status };
    await completeIdempotency(idem.record.id, response);
    return NextResponse.json(response);
  } catch (e) {
    return apiError('VERIFY_FAILED', e instanceof Error ? e.message : 'Verification failed', 500);
  }
}
