import { NextRequest, NextResponse } from 'next/server';
import { requireApiKey } from '@/src/infrastructure/api';
import { apiError } from '@/src/infrastructure/http';
import {
  beginIdempotency,
  completeIdempotency,
} from '@/src/modules/idempotency/idempotency.service';
import { PaymentService } from '@/src/modules/payments/payment.service';
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const denied = requireApiKey(req);
  if (denied) return denied;
  const key = req.headers.get('idempotency-key');
  if (!key) return apiError('IDEMPOTENCY_KEY_REQUIRED', 'Idempotency-Key is required');
  try {
    const { id } = await params,
      body = await req.json().catch(() => ({})),
      idem = await beginIdempotency(key, `POST:/v1/payments/${id}/retry`, body);
    if (idem.kind === 'existing')
      return NextResponse.json(idem.record.responseBody ?? { code: 'PROCESSING' }, {
        status: idem.record.status === 'COMPLETED' ? 200 : 409,
      });
    const result = await PaymentService.attempt(id, body.scenario);
    await completeIdempotency(idem.record.id, result);
    return NextResponse.json(result);
  } catch (e) {
    return apiError('RETRY_FAILED', e instanceof Error ? e.message : 'Retry failed');
  }
}
