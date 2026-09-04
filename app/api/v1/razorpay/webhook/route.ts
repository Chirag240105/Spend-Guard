import { NextRequest, NextResponse } from 'next/server';
import { getPaymentProvider } from '@/src/modules/providers/payment-provider';
import { getPrismaClient } from '@/src/infrastructure/database';
import { PaymentService } from '@/src/modules/payments/payment.service';

export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  const signature = req.headers.get('x-razorpay-signature') ?? '';
  const provider = getPaymentProvider();
  if (!provider.verifyWebhookSignature(rawBody, signature)) {
    return NextResponse.json({ code: 'INVALID_SIGNATURE' }, { status: 400 });
  }
  try {
    const payload = JSON.parse(rawBody) as {
      event?: string;
      payload?: { payment?: { entity?: { id?: string; order_id?: string; status?: string } } };
    };
    const gatewayPayment = payload.payload?.payment?.entity;
    const gatewayOrderId = gatewayPayment?.order_id;
    const gatewayPaymentId = gatewayPayment?.id;
    if (!payload.event || !gatewayOrderId || !gatewayPaymentId) {
      return NextResponse.json({ code: 'INVALID_PAYLOAD' }, { status: 400 });
    }
    const prisma = getPrismaClient();
    const order = await prisma.order.findUnique({ where: { gatewayOrderId } });
    if (!order) return NextResponse.json({ code: 'ORDER_NOT_FOUND' }, { status: 404 });
    const existing = await prisma.webhookEvent.findUnique({
      where: { merchantId_dedupeKey: { merchantId: order.merchantId, dedupeKey: gatewayPaymentId + ':' + payload.event } },
    });
    if (existing) return NextResponse.json({ ok: true, duplicate: true });
    await prisma.webhookEvent.create({
      data: {
        merchantId: order.merchantId,
        eventType: payload.event,
        dedupeKey: gatewayPaymentId + ':' + payload.event,
        payload: JSON.parse(rawBody),
        deliveryStatus: 'delivered',
      },
    });
    if (payload.event === 'payment.captured' || gatewayPayment.status === 'captured') {
      await PaymentService.recordCapturedPayment(order.id, gatewayPaymentId, provider.name.toLowerCase());
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ code: 'WEBHOOK_FAILED', message: error instanceof Error ? error.message : 'Webhook failed' }, { status: 500 });
  }
}
