import { NextRequest, NextResponse } from 'next/server';
import { requireApiKey } from '@/src/infrastructure/api';
import { apiError } from '@/src/infrastructure/http';
import { resolveApproval } from '@/src/modules/recovery/recovery.service';
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
 const denied = requireApiKey(req); if (denied) return denied;
 try { const { id } = await params; return NextResponse.json({ result: await resolveApproval(id, true) }); }
 catch (error) { return apiError('APPROVAL_FAILED', error instanceof Error ? error.message : 'Unable to approve', 409); }
}
