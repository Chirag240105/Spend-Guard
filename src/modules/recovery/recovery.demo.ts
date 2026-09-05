import { MockDiagnosisProvider } from '@/src/modules/agent/diagnosis';
import { getPrismaClient } from '@/src/infrastructure/database';
import { PaymentService } from '@/src/modules/payments/payment.service';
import { MockPaymentProvider } from '@/src/modules/providers/payment-provider';
import { diagnoseFailedPayment } from '@/src/workers/diagnosis.worker';
import { resolveApproval, recordRecoveryAttempt } from './recovery.service';
import { getRecoveryAnalytics } from './recovery.analytics';

type DemoMode = 'RECOVER' | 'STOP' | 'APPROVE' | 'REJECT';

interface DemoPlan {
  scenario:
    | 'TRANSIENT_NETWORK'
    | 'GATEWAY_TIMEOUT'
    | 'BANK_TEMPORARY_FAILURE'
    | 'INSUFFICIENT_FUNDS'
    | 'CARD_DECLINED'
    | 'UNKNOWN';
  mode: DemoMode;
  amount: number;
  merchant: string;
  category: string;
  note: string;
}

export interface RecoveryBatchDemoOptions {
  batchSize?: number;
  seed?: number;
  merchantId?: string;
  clearExisting?: boolean;
}

export interface RecoveryBatchDemoResult {
  batchId: string;
  summary: Awaited<ReturnType<typeof getRecoveryAnalytics>>['summary'];
  recentRecoveries: Awaited<ReturnType<typeof getRecoveryAnalytics>>['recentRecoveries'];
}

function mulberry32(seed: number) {
  let t = seed >>> 0;
  return function rng() {
    t += 0x6d2b79f5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffle<T>(items: T[], seed: number): T[] {
  const rng = mulberry32(seed);
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function buildPlans(seed = 20260905, batchSize = 100): DemoPlan[] {
  const basePlans: DemoPlan[] = [
    ...Array.from({ length: 16 }, () => ({
      scenario: 'GATEWAY_TIMEOUT' as const,
      mode: 'RECOVER' as const,
      amount: 4999,
      merchant: 'Gateway Timeout Ltd',
      category: 'Payments',
      note: 'Transient gateway timeout recovered on retry',
    })),
    ...Array.from({ length: 8 }, () => ({
      scenario: 'GATEWAY_TIMEOUT' as const,
      mode: 'STOP' as const,
      amount: 7999,
      merchant: 'Gateway Timeout Ltd',
      category: 'Payments',
      note: 'Gateway timeout retried until stop rule fired',
    })),
    ...Array.from({ length: 12 }, () => ({
      scenario: 'BANK_TEMPORARY_FAILURE' as const,
      mode: 'RECOVER' as const,
      amount: 12999,
      merchant: 'Regional Bank Services',
      category: 'Banking',
      note: 'Temporary bank outage recovered on retry',
    })),
    ...Array.from({ length: 6 }, () => ({
      scenario: 'BANK_TEMPORARY_FAILURE' as const,
      mode: 'STOP' as const,
      amount: 15999,
      merchant: 'Regional Bank Services',
      category: 'Banking',
      note: 'Bank failure exhausted retry budget',
    })),
    ...Array.from({ length: 14 }, () => ({
      scenario: 'TRANSIENT_NETWORK' as const,
      mode: 'RECOVER' as const,
      amount: 3499,
      merchant: 'Mobile Network Gateway',
      category: 'Connectivity',
      note: 'Transient network blip recovered immediately',
    })),
    ...Array.from({ length: 4 }, () => ({
      scenario: 'TRANSIENT_NETWORK' as const,
      mode: 'STOP' as const,
      amount: 5499,
      merchant: 'Mobile Network Gateway',
      category: 'Connectivity',
      note: 'Transient network error retried to stop',
    })),
    ...Array.from({ length: 20 }, () => ({
      scenario: 'INSUFFICIENT_FUNDS' as const,
      mode: 'STOP' as const,
      amount: 24999,
      merchant: 'Retail Checkout',
      category: 'Retail',
      note: 'Insufficient funds routed to stop rules',
    })),
    ...Array.from({ length: 6 }, () => ({
      scenario: 'CARD_DECLINED' as const,
      mode: 'APPROVE' as const,
      amount: 8999,
      merchant: 'Card Issuer Desk',
      category: 'Card',
      note: 'Card decline approved by human reviewer',
    })),
    ...Array.from({ length: 4 }, () => ({
      scenario: 'CARD_DECLINED' as const,
      mode: 'REJECT' as const,
      amount: 10999,
      merchant: 'Card Issuer Desk',
      category: 'Card',
      note: 'Card decline rejected by human reviewer',
    })),
    ...Array.from({ length: 5 }, () => ({
      scenario: 'UNKNOWN' as const,
      mode: 'APPROVE' as const,
      amount: 6999,
      merchant: 'Unknown Risk Desk',
      category: 'Risk',
      note: 'Unknown failure escalated then approved',
    })),
    ...Array.from({ length: 5 }, () => ({
      scenario: 'UNKNOWN' as const,
      mode: 'REJECT' as const,
      amount: 6199,
      merchant: 'Unknown Risk Desk',
      category: 'Risk',
      note: 'Unknown failure escalated then rejected',
    })),
  ];

  const rng = mulberry32(seed);
  const enriched = basePlans.map((plan, index) => ({
    ...plan,
    amount: plan.amount + Math.floor(rng() * 350) + index,
    merchant: `${plan.merchant} ${String((index % 7) + 1).padStart(2, '0')}`,
    note: `${plan.note} #${index + 1}`,
  }));
  return shuffle(enriched, seed).slice(0, batchSize);
}

async function resetDemoMerchantData(merchantId: string) {
  const prisma = getPrismaClient();
  const orders = await prisma.order.findMany({ where: { merchantId }, select: { id: true } });
  const orderIds = orders.map((order) => order.id);
  if (orderIds.length === 0) return;

  const payments = await prisma.payment.findMany({
    where: { orderId: { in: orderIds } },
    select: { id: true },
  });
  const paymentIds = payments.map((payment) => payment.id);
  const recoveries = await prisma.paymentRecovery.findMany({
    where: { paymentId: { in: paymentIds } },
    select: { id: true },
  });
  const recoveryIds = recoveries.map((recovery) => recovery.id);
  const decisions = await prisma.agentDecision.findMany({
    where: { paymentId: { in: paymentIds } },
    select: { id: true },
  });
  const decisionIds = decisions.map((decision) => decision.id);
  const approvals = await prisma.humanApproval.findMany({
    where: { agentDecisionId: { in: decisionIds } },
    select: { id: true },
  });
  const approvalIds = approvals.map((approval) => approval.id);
  const ledgerTransactions = await prisma.ledgerTransaction.findMany({
    where: { paymentId: { in: paymentIds } },
    select: { id: true },
  });
  const ledgerTransactionIds = ledgerTransactions.map((transaction) => transaction.id);

  await prisma.$transaction([
    prisma.auditLog.deleteMany({
      where: {
        OR: [{ paymentId: { in: paymentIds } }, { recoveryId: { in: recoveryIds } }],
      },
    }),
    prisma.humanApproval.deleteMany({ where: { id: { in: approvalIds } } }),
    prisma.agentDecision.deleteMany({ where: { id: { in: decisionIds } } }),
    prisma.paymentAttempt.deleteMany({ where: { paymentId: { in: paymentIds } } }),
    prisma.ledgerEntry.deleteMany({ where: { ledgerTransactionId: { in: ledgerTransactionIds } } }),
    prisma.ledgerTransaction.deleteMany({ where: { id: { in: ledgerTransactionIds } } }),
    prisma.paymentRecovery.deleteMany({ where: { id: { in: recoveryIds } } }),
    prisma.outboxEvent.deleteMany({ where: { aggregateId: { in: paymentIds } } }),
    prisma.payment.deleteMany({ where: { id: { in: paymentIds } } }),
    prisma.order.deleteMany({ where: { id: { in: orderIds } } }),
  ]);
}

export async function runRecoveryBatchDemo(
  options: RecoveryBatchDemoOptions = {},
): Promise<RecoveryBatchDemoResult> {
  const prisma = getPrismaClient();
  const merchantId = options.merchantId ?? 'recovery-demo-merchant';
  const batchId = `recovery-demo-${options.seed ?? 20260905}`;
  const batchSize = options.batchSize ?? 100;
  const plans = buildPlans(options.seed ?? 20260905, batchSize);

  if (options.clearExisting !== false) {
    await resetDemoMerchantData(merchantId);
  }

  await prisma.merchant.upsert({
    where: { id: merchantId },
    create: {
      id: merchantId,
      apiKeyHash: `demo-${merchantId}`,
      webhookUrl: null,
    },
    update: {},
  });

  const diagnosisProvider = new MockDiagnosisProvider();

  for (const [index, plan] of plans.entries()) {
    const order = await PaymentService.createOrder(merchantId, plan.amount, 'INR');
    const paymentResult = await PaymentService.createPayment(
      order.id,
      'mock',
      plan.scenario,
      new MockPaymentProvider(),
    );
    if (!paymentResult.paymentId) {
      throw new Error(`Missing paymentId for demo plan ${index + 1}`);
    }

    await diagnoseFailedPayment(paymentResult.paymentId, diagnosisProvider, {
      queueRecovery: false,
      maxAttempts: 3,
      scenario: plan.scenario,
      actor: 'recovery-demo',
    });

    if (plan.mode === 'RECOVER') {
      const retry = await PaymentService.attempt(
        paymentResult.paymentId,
        undefined,
        new MockPaymentProvider(),
      );
      await recordRecoveryAttempt(paymentResult.paymentId, {
        success: retry.success,
        errorCode: retry.errorCode,
        error: retry.error,
        actor: 'recovery-demo',
      });
    } else if (plan.mode === 'STOP') {
      let attempt = 0;
      while (attempt < 3) {
        if (attempt > 0) {
          await PaymentService.transition(paymentResult.paymentId, 'RECOVERY_PENDING');
        }
        const retry = await PaymentService.attempt(
          paymentResult.paymentId,
          plan.scenario,
          new MockPaymentProvider(),
        );
        const result = await recordRecoveryAttempt(paymentResult.paymentId, {
          success: retry.success,
          errorCode: retry.errorCode,
          error: retry.error,
          actor: 'recovery-demo',
        });
        if (result.success || !result.shouldRetry) break;
        attempt += 1;
      }
    } else {
      const payment = await prisma.payment.findUnique({
        where: { id: paymentResult.paymentId },
        include: {
          agentDecisions: {
            orderBy: { createdAt: 'desc' },
            include: { approval: true },
          },
        },
      });
      const approval = payment?.agentDecisions[0]?.approval;
      if (!approval) {
        throw new Error(`Missing approval record for human review demo item ${index + 1}`);
      }
      await resolveApproval(
        approval.id,
        plan.mode === 'APPROVE',
        'recovery-demo',
        new MockPaymentProvider(),
      );
    }
  }

  const analytics = await getRecoveryAnalytics();
  return {
    batchId,
    summary: analytics.summary,
    recentRecoveries: analytics.recentRecoveries,
  };
}
