import { NextRequest, NextResponse } from 'next/server';
import { requireApiKey } from '@/src/infrastructure/api';
import { getPrismaClient } from '@/src/infrastructure/database';
import { apiError } from '@/src/infrastructure/http';
import { pagination } from '@/src/infrastructure/api';

export async function GET(req: NextRequest) {
  const denied = requireApiKey(req);
  if (denied) return denied;
  try {
    const { limit, skip } = pagination(req.nextUrl.searchParams, 25, 100);
    const prisma = getPrismaClient();
    const [items, total] = await Promise.all([
      prisma.agentDecision.findMany({
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: {
          payment: { include: { order: true, attempts: true } },
          approval: true,
        },
      }),
      prisma.agentDecision.count(),
    ]);
    return NextResponse.json({ items, total, limit, skip });
  } catch (e) {
    return apiError(
      'DECISIONS_FAILED',
      e instanceof Error ? e.message : 'Failed to list decisions',
      500,
    );
  }
}
