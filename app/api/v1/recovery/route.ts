import { NextRequest, NextResponse } from 'next/server';
import { requireApiKey } from '@/src/infrastructure/api';
import { apiError } from '@/src/infrastructure/http';
import { getRecoveryAnalytics } from '@/src/modules/recovery/recovery.analytics';

export async function GET(req: NextRequest) {
  const denied = requireApiKey(req);
  if (denied) return denied;
  try {
    const { summary, recentRecoveries } = await getRecoveryAnalytics();
    return NextResponse.json({ summary, recentRecoveries });
  } catch (error) {
    return apiError('RECOVERY_ANALYTICS_FAILED', error instanceof Error ? error.message : 'Recovery analytics failed', 500);
  }
}
