import { NextRequest, NextResponse } from 'next/server';
import { requireApiKey } from '@/src/infrastructure/api';
import { getPaymentById } from '@/src/modules/payments/payment.query';
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const denied = requireApiKey(req);
  if (denied) return denied;
  const { id } = await params;
  const p = await getPaymentById(id);
  return p
    ? NextResponse.json({ payment: p })
    : NextResponse.json({ code: 'NOT_FOUND', message: 'Payment not found' }, { status: 404 });
}
