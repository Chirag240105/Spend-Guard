import { NextRequest, NextResponse } from 'next/server';
import { requireApiKey } from '@/src/infrastructure/api';
import { getPrismaClient } from '@/src/infrastructure/database';
import { apiError } from '@/src/infrastructure/http';
export async function GET(req: NextRequest) {
  const denied = requireApiKey(req);
  if (denied) return denied;
  try {
    const approvals = await getPrismaClient().humanApproval.findMany({
      where: { status: 'pending' },
      include: { agentDecision: { include: { payment: { include: { order: true } } } } },
      orderBy: { id: 'asc' },
    });
    return NextResponse.json({ approvals });
  } catch (error) {
    return apiError(
      'APPROVAL_LIST_FAILED',
      error instanceof Error ? error.message : 'Unable to list approvals',
      500,
    );
  }
}
