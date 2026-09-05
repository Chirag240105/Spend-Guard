import { NextRequest, NextResponse } from 'next/server';
import { requireApiKey } from '@/src/infrastructure/api';
import { getPrismaClient } from '@/src/infrastructure/database';
import { apiError } from '@/src/infrastructure/http';
import { getRecoveryAnalytics } from '@/src/modules/recovery/recovery.analytics';

export async function GET(req: NextRequest) {
  const denied = requireApiKey(req);
  if (denied) return denied;
  try {
    const prisma = getPrismaClient();

    const [totalPayments, successPayments, failedPayments, humanReviewCount, pendingApprovals, analytics] =
      await Promise.all([
      prisma.payment.count(),
      prisma.payment.count({ where: { status: 'SUCCESS' } }),
      prisma.payment.count({ where: { status: { in: ['FAILED', 'DO_NOT_RETRY'] } } }),
      prisma.payment.count({ where: { status: 'HUMAN_REVIEW' } }),
      prisma.humanApproval.count({ where: { status: 'pending' } }),
      getRecoveryAnalytics(),
    ]);

    return NextResponse.json({
      summary: {
        totalPayments,
        successPayments,
        failedPayments,
        recoveredPayments: analytics.summary.successfulRecoveries,
        humanReviewCount,
        pendingApprovals,
        revenueRecovered: analytics.summary.totalRecoveredRevenue,
        revenueAtRisk: analytics.summary.totalRevenueAtRisk,
        recoveryRate: analytics.summary.recoveryRate,
        recoveryAttempts: analytics.summary.recoveryAttempts,
        recoverablePayments: analytics.summary.recoverablePayments,
        nonRecoverablePayments: analytics.summary.nonRecoverablePayments,
        revenueRecoveryRate: analytics.summary.revenueRecoveryRate,
        revenueProtectedFromUnnecessaryRetries:
          analytics.summary.revenueProtectedFromUnnecessaryRetries,
        averageRecoveryAttempts: analytics.summary.averageRecoveryAttempts,
        retrySuccessRate: analytics.summary.retrySuccessRate,
        humanEscalationRate: analytics.summary.humanEscalationRate,
        totalPaymentsAnalyzed: analytics.summary.totalPaymentsAnalyzed,
        totalFailedPayments: analytics.summary.totalFailedPayments,
      },
      recentActivity: analytics.recentRecoveries.map((item) => ({
        id: item.id,
        paymentId: item.paymentId,
        policyAction: item.executedAction,
        failureCategory: item.failureCategory,
        confidence: item.confidence,
        riskLevel: item.riskLevel,
        recommendedAction: item.recommendedAction,
        reason: item.reason,
        amount: item.amount,
        currency: item.currency,
        createdAt: item.createdAt,
        approvalStatus: item.approvalStatus,
        paymentStatus: item.paymentStatus,
        recoveryStatus: item.status,
        attemptCount: item.attemptCount,
        maxAttempts: item.maxAttempts,
        stopReason: item.stopReason,
        recoveredAmount: item.recoveredAmount,
        escalated: item.escalated,
      })),
    });
  } catch (e) {
    return apiError('DASHBOARD_FAILED', e instanceof Error ? e.message : 'Dashboard error', 500);
  }
}
