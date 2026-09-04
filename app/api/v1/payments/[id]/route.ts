import { NextRequest, NextResponse } from 'next/server';
import { getPrismaClient } from '@/src/infrastructure/database';
import { requireApiKey } from '@/src/infrastructure/api';
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const denied = requireApiKey(req);
  if (denied) return denied;
  const { id } = await params;
  const p = await getPrismaClient().payment.findUnique({
    where: { id },
    include: { order: true, attempts: true, agentDecisions: true },
  });
  return p
    ? NextResponse.json({ payment: p })
    : NextResponse.json({ code: 'NOT_FOUND', message: 'Payment not found' }, { status: 404 });
}
