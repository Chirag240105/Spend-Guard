import { NextRequest, NextResponse } from 'next/server';
import { requireApiKey } from '@/src/infrastructure/api';
import { apiError } from '@/src/infrastructure/http';
import { pagination } from '@/src/infrastructure/api';
import { getPrismaClient } from '@/src/infrastructure/database';

export async function GET(req: NextRequest) {
  const denied = requireApiKey(req);
  if (denied) return denied;
  try {
    const { limit, skip } = pagination(req.nextUrl.searchParams, 25, 100);
    const status = req.nextUrl.searchParams.get('status') ?? undefined;
    const prisma = getPrismaClient();
    const where = status ? { status: status as never } : undefined;
    const [items, total] = await Promise.all([
      prisma.payment.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: {
          order: true,
          attempts: { orderBy: { createdAt: 'desc' } },
          agentDecisions: {
            orderBy: { createdAt: 'desc' },
            take: 1,
            include: { approval: true },
          },
        },
      }),
      prisma.payment.count({ where }),
    ]);
    return NextResponse.json({ items, total, limit, skip });
  } catch (e) {
    return apiError('PAYMENTS_FAILED', e instanceof Error ? e.message : 'Failed to list payments', 500);
  }
}

export async function POST(req: NextRequest) {
  const denied = requireApiKey(req);
  if (denied) return denied;
  try {
    const body = await req.json();
    const { PaymentService } = await import('@/src/modules/payments/payment.service');
    const { MockPaymentProvider } = await import('@/src/modules/providers/payment-provider');
    const order = await PaymentService.createOrder(body.merchantId ?? 'demo-merchant', body.amount ?? 100, body.currency ?? 'INR');
    const result = await PaymentService.createPayment(order.id, body.provider ?? 'mock', body.scenario, new MockPaymentProvider());
    return NextResponse.json({ result }, { status: 201 });
  } catch (e) {
    return apiError('PAYMENT_CREATE_FAILED', e instanceof Error ? e.message : 'Failed', 500);
  }
}
