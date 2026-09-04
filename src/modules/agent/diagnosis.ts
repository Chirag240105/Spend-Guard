import { getPaymentProvider, RazorpayAdapter } from '../providers/payment-provider';
import { getRedisClient } from '../../infrastructure/redis';
import { getPrismaClient } from '../../infrastructure/database';

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