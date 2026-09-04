import { NextRequest, NextResponse } from 'next/server';
import { requireApiKey } from '@/src/infrastructure/api';
import { apiError } from '@/src/infrastructure/http';
import { resolveApproval } from '@/src/modules/recovery/recovery.service';
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
 const denied = requireApiKey(req); if (denied) return denied;
 try { const { id } = await params; return NextResponse.json({ result: await resolveApproval(id, false) }); }
 catch (error) { return apiError('REJECTION_FAILED', error instanceof Error ? error.message : 'Unable to reject', 409); }
}
