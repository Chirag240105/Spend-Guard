import { NextRequest, NextResponse } from 'next/server';
import { AuditService } from '@/src/modules/audit/audit.service';
import { pagination, requireApiKey } from '@/src/infrastructure/api';

export async function GET(request: NextRequest) {
  const denied = requireApiKey(request); if (denied) return denied;
  try {
    const { page, limit, skip } = pagination(request.nextUrl.searchParams);
    const query = request.nextUrl.searchParams;
    const from = query.get('from') ? new Date(query.get('from')!) : undefined;
    const to = query.get('to') ? new Date(query.get('to')!) : undefined;
    const { items, total } = await AuditService.listAuditLog({ skip, take: limit, policyId: query.get('policyId') ?? undefined, event: query.get('event') ?? undefined, from: from && !Number.isNaN(from.valueOf()) ? from : undefined, to: to && !Number.isNaN(to.valueOf()) ? to : undefined });
    return NextResponse.json({ success: true, items, pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
  } catch (error) { console.error('Error listing audit:', error); return NextResponse.json({ error: 'Failed to list audit log' }, { status: 500 }); }
}
