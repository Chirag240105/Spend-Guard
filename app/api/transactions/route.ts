import { NextRequest, NextResponse } from 'next/server';
import { DecisionService } from '@/src/modules/decision/decision.service';
import { pagination, requireApiKey } from '@/src/infrastructure/api';

export async function GET(request: NextRequest) {
  const denied = requireApiKey(request);
  if (denied) return denied;
  try {
    const { page, limit, skip } = pagination(request.nextUrl.searchParams);
    const state = request.nextUrl.searchParams.get('decision');
    const decision = state === 'ALLOW' || state === 'HOLD' || state === 'BLOCK' ? state : undefined;
    const { items, total } = await DecisionService.listDecisions({ skip, take: limit, decision });
    return NextResponse.json({
      success: true,
      items,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error('Error listing transactions:', error);
    return NextResponse.json({ error: 'Failed to list transactions' }, { status: 500 });
  }
}
