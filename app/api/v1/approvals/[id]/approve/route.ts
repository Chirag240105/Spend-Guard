import { NextRequest, NextResponse } from 'next/server';
import { requireApiKey } from '@/src/infrastructure/api';
import { apiError } from '@/src/infrastructure/http';
import { resolveApproval } from '@/src/modules/recovery/recovery.service';
import { getAuthFromRequest } from '@/src/modules/auth/auth.service';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const denied = requireApiKey(req);
  if (denied) return denied;
  try {
    const { id } = await params;
    const auth = getAuthFromRequest(req);
    const reviewer = auth?.name ?? auth?.email ?? 'reviewer';
    const result = await resolveApproval(id, true, reviewer);
    return NextResponse.json({ ok: true, result });
  } catch (e) {
    return apiError('APPROVE_FAILED', e instanceof Error ? e.message : 'Approval failed', 400);
  }
}
