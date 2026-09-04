import { NextRequest, NextResponse } from 'next/server';
import { requireApiKey } from '@/src/infrastructure/api';
import { apiError } from '@/src/infrastructure/http';
import { getPaymentProvider } from '@/src/modules/providers/payment-provider';
import { PaymentService } from '@/src/modules/payments/payment.service';
import { z } from 'zod';

const schema = z.object({
  merchantId: z.string().min(1),
  amount: z.number().positive().int(), // in paise
  currency: z.string().length(3).default('INR'),
});

export async function POST(req: NextRequest) {
  const denied = requireApiKey(req);
  if (denied) return denied;
  try {
    const body = schema.parse(await req.json());
    // Create internal order
    const order = await PaymentService.createOrder(
      body.merchantId,
      body.amount / 100, // store in rupees
      body.currency,
    );

    const provider = getPaymentProvider();
    const gatewayOrder = await provider.createOrder({
      amount: body.amount,
      currency: body.currency,
      receipt: order.id,
      notes: { internalOrderId: order.id, merchantId: body.merchantId },
    });
    await PaymentService.attachGatewayOrder(order.id, gatewayOrder.orderId);

    return NextResponse.json(
      {
        internalOrderId: order.id,
        razorpayOrderId: gatewayOrder.orderId,
        amount: body.amount,
        currency: body.currency,
        keyId: process.env.RAZORPAY_KEY_ID ?? null,
      },
      { status: 201 },
    );
  } catch (e) {
    return apiError(
      'ORDER_CREATE_FAILED',
      e instanceof Error ? e.message : 'Failed to create order',
      500,
    );
  }
}
