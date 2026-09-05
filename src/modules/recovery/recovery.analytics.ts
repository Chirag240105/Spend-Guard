import { Prisma, RecoveryStatus } from '@prisma/client';
import { getPrismaClient } from '@/src/infrastructure/database';

export interface RecoveryAnalyticsSummary {
  totalPaymentsAnalyzed: number;
  totalFailedPayments: number;
  totalRevenueAtRisk: number;
  recoverablePayments: number;
  nonRecoverablePayments: number;
  humanReviewPayments: number;
  recoveryAttempts: number;
  successfulRecoveries: number;
  totalRecoveredRevenue: number;
  recoveryRate: number;
  revenueRecoveryRate: number;
  revenueProtectedFromUnnecessaryRetries: number;
  averageRecoveryAttempts: number;
  retrySuccessRate: number;
  humanEscalationRate: number;
}

export interface RecoveryActivityItem {
  id: string;
  paymentId: string;
  status: RecoveryStatus;
  failureCategory: string;
  confidence: number;
  riskLevel: string;
  recommendedAction: string;
  executedAction: string;
  reason: string;
  amount: number;
  currency: string;
  attemptCount: number;
  maxAttempts: number;
  stopReason: string | null;
  escalated: boolean;
  recoveredAmount: number;
  paymentStatus: string;
  approvalStatus: string | null;
  createdAt: Date;
  updatedAt: Date;
}

const retryActions = new Set(['AUTO_RETRY', 'DELAYED_RETRY']);
const nonRecoverableReasons = new Set([
  'NON_RECOVERABLE_FAILURE',
  'MAX_RETRIES_REACHED',
  'RECOVERY_WINDOW_EXPIRED',
  'HUMAN_REVIEW_REJECTED',
  'APPROVED_RETRY_FAILED',
]);

function toNumber(value: Prisma.Decimal | number | string | null | undefined) {
  if (value == null) return 0;
  return Number(value);
}

function getDiagnosisValue(diagnosis: Prisma.JsonValue, key: string): unknown {
  return typeof diagnosis === 'object' && diagnosis !== null
    ? (diagnosis as Record<string, unknown>)[key]
    : undefined;
}

export async function getRecoveryAnalytics() {
  const prisma = getPrismaClient();
  const payments = await prisma.payment.findMany({
    include: {
      order: true,
      attempts: { orderBy: { createdAt: 'asc' } },
      agentDecisions: {
        orderBy: { createdAt: 'desc' },
        include: { approval: true },
      },
      recovery: true,
    },
    orderBy: { createdAt: 'desc' },
  });
  const recoveries = await prisma.paymentRecovery.findMany({
    include: {
      payment: {
        include: {
          order: true,
          attempts: { orderBy: { createdAt: 'asc' } },
          agentDecisions: {
            orderBy: { createdAt: 'desc' },
            include: { approval: true },
          },
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  const totalPaymentsAnalyzed = payments.length;
  const totalFailedPayments = recoveries.length;
  const totalRevenueAtRisk = recoveries.reduce(
    (sum, recovery) => sum + toNumber(recovery.amountAtRisk),
    0,
  );
  const recoverablePayments = recoveries.filter((recovery) =>
    retryActions.has(recovery.executedAction),
  ).length;
  const nonRecoverablePayments = recoveries.filter(
    (recovery) => recovery.executedAction === 'DO_NOT_RETRY',
  ).length;
  const humanReviewPayments = recoveries.filter(
    (recovery) =>
      recovery.executedAction === 'HUMAN_REVIEW' || recovery.status === RecoveryStatus.HUMAN_REVIEW,
  ).length;
  const recoveryAttempts = recoveries.reduce((sum, recovery) => sum + recovery.attemptCount, 0);
  const successfulRecoveries = recoveries.filter(
    (recovery) => recovery.status === RecoveryStatus.SUCCESS,
  ).length;
  const totalRecoveredRevenue = recoveries.reduce(
    (sum, recovery) => sum + toNumber(recovery.recoveredAmount),
    0,
  );
  const revenueProtectedFromUnnecessaryRetries = recoveries
    .filter((recovery) => recovery.stopped && nonRecoverableReasons.has(recovery.stopReason ?? ''))
    .reduce((sum, recovery) => sum + toNumber(recovery.amountAtRisk), 0);

  const recoveryRate =
    recoverablePayments > 0 ? Math.round((successfulRecoveries / recoverablePayments) * 100) : 0;
  const revenueRecoveryRate =
    totalRevenueAtRisk > 0 ? Math.round((totalRecoveredRevenue / totalRevenueAtRisk) * 100) : 0;
  const averageRecoveryAttempts =
    totalFailedPayments > 0 ? Number((recoveryAttempts / totalFailedPayments).toFixed(2)) : 0;
  const retrySuccessRate =
    recoveryAttempts > 0 ? Math.round((successfulRecoveries / recoveryAttempts) * 100) : 0;
  const humanEscalationRate =
    totalFailedPayments > 0 ? Math.round((humanReviewPayments / totalFailedPayments) * 100) : 0;

  const summary: RecoveryAnalyticsSummary = {
    totalPaymentsAnalyzed,
    totalFailedPayments,
    totalRevenueAtRisk,
    recoverablePayments,
    nonRecoverablePayments,
    humanReviewPayments,
    recoveryAttempts,
    successfulRecoveries,
    totalRecoveredRevenue,
    recoveryRate,
    revenueRecoveryRate,
    revenueProtectedFromUnnecessaryRetries,
    averageRecoveryAttempts,
    retrySuccessRate,
    humanEscalationRate,
  };

  const recentRecoveries: RecoveryActivityItem[] = recoveries.slice(0, 10).map((recovery) => {
    const diagnosis = recovery.diagnosis;
    const latestDecision = recovery.payment.agentDecisions[0];
    const output = (latestDecision?.output ?? diagnosis) as Prisma.JsonValue;
    const approvalStatus = latestDecision?.approval?.status ?? null;
    return {
      id: recovery.id,
      paymentId: recovery.paymentId,
      status: recovery.status,
      failureCategory: String(
        getDiagnosisValue(diagnosis, 'failure_category') ?? recovery.failureCategory,
      ),
      confidence: Number(getDiagnosisValue(output, 'confidence') ?? 0),
      riskLevel: String(getDiagnosisValue(output, 'risk_level') ?? 'UNKNOWN'),
      recommendedAction: String(
        getDiagnosisValue(output, 'recommended_action') ?? recovery.recommendedAction,
      ),
      executedAction: recovery.executedAction,
      reason: String(getDiagnosisValue(output, 'reason') ?? ''),
      amount: toNumber(recovery.amountAtRisk),
      currency: recovery.payment.order.currency,
      attemptCount: recovery.attemptCount,
      maxAttempts: recovery.maxAttempts,
      stopReason: recovery.stopReason,
      escalated: recovery.escalated,
      recoveredAmount: toNumber(recovery.recoveredAmount),
      paymentStatus: recovery.payment.status,
      approvalStatus,
      createdAt: recovery.createdAt,
      updatedAt: recovery.updatedAt,
    };
  });

  return { summary, recentRecoveries, recoveries };
}
