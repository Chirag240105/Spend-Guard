import { NextRequest, NextResponse } from 'next/server';
import { requireApiKey } from '@/src/infrastructure/api';
import { getPrismaClient } from '@/src/infrastructure/database';
import { apiError } from '@/src/infrastructure/http';

export async function GET(req: NextRequest) {
  const denied = requireApiKey(req);
  if (denied) return denied;
  try {
    const prisma = getPrismaClient();

    const [
      totalPayments,
      successPayments,
      failedPayments,
      humanReviewCount,
      recoveredPayments,
      recentDecisions,
      pendingApprovals,
    ] = await Promise.all([
      prisma.payment.count(),
      prisma.payment.count({ where: { status: 'SUCCESS' } }),
      prisma.payment.count({ where: { status: { in: ['FAILED', 'DO_NOT_RETRY'] } } }),
      prisma.payment.count({ where: { status: 'HUMAN_REVIEW' } }),
      // Recovered = payments that retried and eventually succeeded
      prisma.payment.count({ where: { status: 'SUCCESS', retryCount: { gt: 0 } } }),
      // Recent AI decisions with full context for activity feed
      prisma.agentDecision.findMany({
        orderBy: { createdAt: 'desc' },
        take: 10,
        include: {
          payment: { include: { order: true } },
          approval: true,
        },
      }),
      prisma.humanApproval.count({ where: { status: 'pending' } }),
    ]);

    // Revenue recovered = sum of amounts for successfully-retried payments
    const recoveredOrders = await prisma.payment.findMany({
      where: { status: 'SUCCESS', retryCount: { gt: 0 } },
      include: { order: true },
    });
    const revenueRecovered = recoveredOrders.reduce((sum, p) => sum + Number(p.order.amount), 0);

    // Revenue at risk = sum of amounts for HUMAN_REVIEW payments
    const atRiskOrders = await prisma.payment.findMany({
      where: { status: 'HUMAN_REVIEW' },
      include: { order: true },
    });
    const revenueAtRisk = atRiskOrders.reduce((sum, p) => sum + Number(p.order.amount), 0);

    const recoveryRate =
      totalPayments > 0
        ? Math.round((recoveredPayments / Math.max(failedPayments + recoveredPayments, 1)) * 100)
        : 0;

    return NextResponse.json({
      summary: {
        totalPayments,
        successPayments,
        failedPayments,
        recoveredPayments,
        humanReviewCount,
        pendingApprovals,
        revenueRecovered,
        revenueAtRisk,
        recoveryRate,
      },
      recentActivity: recentDecisions.map((d) => {
        const output = d.output as Record<string, unknown>;
        return {
          id: d.id,
          paymentId: d.paymentId,
          policyAction: d.policyAction,
          failureCategory: output.failure_category,
          confidence: output.confidence,
          riskLevel: output.risk_level,
          recommendedAction: output.recommended_action,
          reason: output.reason,
          amount: Number(d.payment.order.amount),
          currency: d.payment.order.currency,
          createdAt: d.createdAt,
          approvalStatus: d.approval?.status ?? null,
          paymentStatus: d.payment.status,
        };
      }),
    });
  } catch (e) {
    return apiError('DASHBOARD_FAILED', e instanceof Error ? e.message : 'Dashboard error', 500);
  }
}
