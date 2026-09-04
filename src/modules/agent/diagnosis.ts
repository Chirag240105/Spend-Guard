import { z } from 'zod';
import { getPaymentProvider, RazorpayAdapter } from '../providers/payment-provider';
import { getRedisClient } from '../../infrastructure/redis';
import { getPrismaClient } from '../../infrastructure/database';

export const AgentDiagnosisSchema = z.object({
  failure_category: z.enum([
    'TRANSIENT_NETWORK',
    'GATEWAY_TIMEOUT',
    'BANK_TEMPORARY_FAILURE',
    'INSUFFICIENT_FUNDS',
    'CARD_DECLINED',
    'UNKNOWN',
  ]),
  confidence: z.number(),
  risk_level: z.enum(['LOW', 'MEDIUM', 'HIGH']),
  recommended_action: z.enum(['AUTO_RETRY', 'DELAYED_RETRY', 'HUMAN_REVIEW', 'DO_NOT_RETRY']),
  retry_after_seconds: z.number(),
  reason: z.string(),
});

export type AgentDiagnosis = z.infer<typeof AgentDiagnosisSchema>;

export function humanReviewDiagnosis(reason: string): AgentDiagnosis {
  return {
    failure_category: 'UNKNOWN',
    confidence: 0,
    risk_level: 'HIGH',
    recommended_action: 'HUMAN_REVIEW',
    retry_after_seconds: 0,
    reason,
  };
}

export interface AIProvider {
  diagnose(context: { gatewayErrorCode?: string; paymentId?: string; retryCount?: number }): Promise<AgentDiagnosis>;
}

export class MockDiagnosisProvider implements AIProvider {
  async diagnose(context: { gatewayErrorCode?: string; paymentId?: string; retryCount?: number }): Promise<AgentDiagnosis> {
    const code = context.gatewayErrorCode ?? 'UNKNOWN';
    if (code === 'TRANSIENT_NETWORK') {
      return {
        failure_category: 'TRANSIENT_NETWORK',
        confidence: 0.95,
        risk_level: 'LOW',
        recommended_action: 'AUTO_RETRY',
        retry_after_seconds: 5,
        reason: 'Network timeout during transaction processing; safe for immediate retry',
      };
    }
    if (code === 'GATEWAY_TIMEOUT') {
      return {
        failure_category: 'GATEWAY_TIMEOUT',
        confidence: 0.85,
        risk_level: 'LOW',
        recommended_action: 'DELAYED_RETRY',
        retry_after_seconds: 30,
        reason: 'Payment gateway timeout; delayed retry scheduled',
      };
    }
    if (code === 'BANK_TEMPORARY_FAILURE') {
      return {
        failure_category: 'BANK_TEMPORARY_FAILURE',
        confidence: 0.85,
        risk_level: 'LOW',
        recommended_action: 'DELAYED_RETRY',
        retry_after_seconds: 60,
        reason: 'Issuing bank temporary unavailability',
      };
    }
    if (code === 'INSUFFICIENT_FUNDS') {
      return {
        failure_category: 'INSUFFICIENT_FUNDS',
        confidence: 0.99,
        risk_level: 'HIGH',
        recommended_action: 'DO_NOT_RETRY',
        retry_after_seconds: 0,
        reason: 'Customer account has insufficient funds; do not retry automatically',
      };
    }
    if (code === 'CARD_DECLINED') {
      return {
        failure_category: 'CARD_DECLINED',
        confidence: 0.90,
        risk_level: 'HIGH',
        recommended_action: 'HUMAN_REVIEW',
        retry_after_seconds: 0,
        reason: 'Card declined by issuer; requires user investigation',
      };
    }
    return humanReviewDiagnosis('Unrecognized failure mode; routed to human review');
  }
}

export interface DiagnosisReport {
  healthy: boolean;
  checks: Array<{
    name: string;
    status: 'pass' | 'fail' | 'warn';
    message: string;
    detail?: unknown;
  }>;
  timestamp: string;
}

export async function runSystemDiagnosis(): Promise<DiagnosisReport> {
  const checks: DiagnosisReport['checks'] = [];
  const prisma = getPrismaClient();

  // 1. Database connectivity
  try {
    await prisma.$queryRaw`SELECT 1`;
    checks.push({ name: 'Database', status: 'pass', message: 'PostgreSQL connection OK' });
  } catch (e) {
    checks.push({
      name: 'Database',
      status: 'fail',
      message: `PostgreSQL unreachable: ${e instanceof Error ? e.message : String(e)}`,
    });
  }

  // 2. Redis connectivity
  try {
    const redis = await getRedisClient();
    await redis.ping();
    checks.push({ name: 'Redis', status: 'pass', message: 'Redis connection OK' });
  } catch (e) {
    checks.push({
      name: 'Redis',
      status: 'fail',
      message: `Redis unreachable: ${e instanceof Error ? e.message : String(e)}`,
    });
  }

  // 3. AI Provider credentials configured
  const hasGrok = !!process.env.XAI_API_KEY;
  const hasGemini = !!process.env.GEMINI_API_KEY;
  if (hasGrok || hasGemini) {
    checks.push({
      name: 'AI Credentials',
      status: 'pass',
      message: `Configured: ${[hasGrok && 'Grok', hasGemini && 'Gemini'].filter(Boolean).join(', ')}`,
    });
  } else {
    checks.push({
      name: 'AI Credentials',
      status: 'warn',
      message: 'No live AI keys found. Falling back to mock compiler.',
    });
  }

  // 4. Razorpay credentials
  const provider = getPaymentProvider();
  const isLiveRazorpay = provider instanceof RazorpayAdapter;
  checks.push({
    name: 'Payment Provider',
    status: isLiveRazorpay ? 'pass' : 'warn',
    message: isLiveRazorpay
      ? `Razorpay live adapter loaded (${process.env.RAZORPAY_KEY_ID})`
      : 'Using MockPaymentProvider. Set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET for live mode.',
  });

  // 5. Razorpay test order (only if live)
  if (isLiveRazorpay) {
    try {
      const order = await provider.createOrder({
        amount: 100, // ₹1 in paise
        currency: 'INR',
        receipt: `diag_${Date.now()}`,
        notes: { source: 'spendguard-diagnosis' },
      });
      checks.push({
        name: 'Razorpay Test Order',
        status: 'pass',
        message: `Created test order ${order.orderId}`,
        detail: order,
      });
    } catch (e) {
      checks.push({
        name: 'Razorpay Test Order',
        status: 'fail',
        message: `Test order failed: ${e instanceof Error ? e.message : String(e)}`,
      });
    }
  }

  const allFail = checks.filter((c) => c.status === 'fail').length;
  return {
    healthy: allFail === 0,
    checks,
    timestamp: new Date().toISOString(),
  };
}