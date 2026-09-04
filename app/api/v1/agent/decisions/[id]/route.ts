import { NextRequest, NextResponse } from 'next/server';
import { requireApiKey } from '@/src/infrastructure/api';
import { getPrismaClient } from '@/src/infrastructure/database';
import { apiError } from '@/src/infrastructure/http';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const denied = requireApiKey(req);
  if (denied) return denied;
  try {
    const { id } = await params;
    const decision = await getPrismaClient().agentDecision.findUnique({
      where: { id },
      include: {
        payment: { include: { order: true, attempts: true } },
        approval: true,
      },
    });
    if (!decision) return apiError('NOT_FOUND', 'Decision not found', 404);
    return NextResponse.json({ decision });
  } catch (e) {
    return apiError('DECISION_FETCH_FAILED', e instanceof Error ? e.message : 'Failed to fetch decision', 500);
  }
}
