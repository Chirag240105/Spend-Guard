import { NextRequest, NextResponse } from 'next/server';
import { requireApiKey } from '@/src/infrastructure/api';
import { apiError } from '@/src/infrastructure/http';
import { runRecoveryBatchDemo } from '@/src/modules/recovery/recovery.demo';

export async function POST(req: NextRequest) {
  const denied = requireApiKey(req);
  if (denied) return denied;
  try {
    const body = await req.json().catch(() => ({}));
    const result = await runRecoveryBatchDemo({
      batchSize: typeof body.batchSize === 'number' ? body.batchSize : 100,
      seed: typeof body.seed === 'number' ? body.seed : 20260905,
      clearExisting: body.clearExisting !== false,
      merchantId: typeof body.merchantId === 'string' ? body.merchantId : undefined,
    });
    return NextResponse.json(result);
  } catch (error) {
    return apiError(
      'RECOVERY_DEMO_FAILED',
      error instanceof Error ? error.message : 'Recovery demo failed',
      500,
    );
  }
}
