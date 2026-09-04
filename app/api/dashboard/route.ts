import { NextRequest, NextResponse } from 'next/server';
import { getPrismaClient } from '@/src/infrastructure/database';
import { requireApiKey } from '@/src/infrastructure/api';

export async function GET(request: NextRequest) {
  const denied = requireApiKey(request);
  if (denied) return denied;
  try {
    const prisma = getPrismaClient();
    const [policies, transactions, grouped, recent] = await Promise.all([
      prisma.policy.count({ where: { active: true } }),
      prisma.transaction.count(),
      prisma.decision.groupBy({ by: ['decision'], _count: true }),
      prisma.decision.findMany({
        orderBy: { createdAt: 'desc' },
        take: 10,
        include: { transaction: true, policy: true },
      }),
    ]);
    const breakdown = { ALLOW: 0, HOLD: 0, BLOCK: 0 };
    grouped.forEach((row) => {
      breakdown[row.decision as keyof typeof breakdown] = row._count;
    });
    return NextResponse.json({
      success: true,
      summary: { policies, transactions, breakdown, pendingApprovals: breakdown.HOLD },
      recent,
    });
  } catch (error) {
    console.error('Dashboard error:', error);
    return NextResponse.json({ error: 'Failed to load dashboard' }, { status: 500 });
  }
}
