import { Prisma, RecoveryStatus } from '@prisma/client';
import { getPrismaClient } from '@/src/infrastructure/database';
import { AuditService } from '../audit/audit.service';
import { PaymentService } from '../payments/payment.service';
import type { AgentDiagnosis } from '../agent/diagnosis';
import type { RecoveryAction } from './policy';
import { getRecoveryStopReason } from './policy';
import { getPaymentProvider, type PaymentProvider } from '../providers/payment-provider';

const DEFAULT_MAX_ATTEMPTS = 3;
const DEFAULT_RECOVERY_WINDOW_MS = 24 * 60 * 60 * 1000;

export interface RecoveryPlanOptions {
  diagnosis?: AgentDiagnosis;
  queueRecovery?: boolean;
  maxAttempts?: number;
  recoveryWindowEndsAt?: Date;
  scenario?: string;
  actor?: string;
}

export interface RecoveryAttemptResult {
  paymentId: string;
  recoveryId: string;
  success: boolean;
  shouldRetry: boolean;
  stopReason?: string | null;
  attemptCount: number;
}

async function logRecoveryEvent(
  event: string,
  paymentId: string,
  recoveryId: string | undefined,
  details: Record<string, unknown>,
  actor = 'recovery-engine',
) {
  return AuditService.logEvent(event, actor, details, undefined, undefined, paymentId, recoveryId);
}

function buildRecoveryWindow(recoveryWindowEndsAt?: Date): Date {
  return recoveryWindowEndsAt ?? new Date(Date.now() + DEFAULT_RECOVERY_WINDOW_MS);
}

async function ensureRecoveryRecord(
  paymentId: string,
  decisionId: string,
  action: RecoveryAction,
  options: RecoveryPlanOptions,
) {
  const prisma = getPrismaClient();
  const existing = await prisma.paymentRecovery.findUnique({ where: { paymentId } });
  if (existing) return existing;

  const payment = await prisma.payment.findUniqueOrThrow({
    where: { id: paymentId },
    include: { order: true, attempts: true },
  });
  const diagnosis = options.diagnosis ?? {
    failure_category: payment.failureReason?.includes('fund') ? 'INSUFFICIENT_FUNDS' : 'UNKNOWN',
    confidence: 0,
    risk_level: 'HIGH',
    recommended_action: action,
    retry_after_seconds: 0,
    reason: 'Recovery record created without a structured diagnosis payload.',
  };

  const recovery = await prisma.paymentRecovery.create({
    data: {
      paymentId,
      diagnosis: diagnosis as Prisma.InputJsonValue,
      failureCategory: diagnosis.failure_category,
      recommendedAction: diagnosis.recommended_action,
      executedAction: action,
      status:
        action === 'DO_NOT_RETRY'
          ? RecoveryStatus.DO_NOT_RETRY
          : action === 'HUMAN_REVIEW'
            ? RecoveryStatus.HUMAN_REVIEW
            : RecoveryStatus.PENDING,
      attemptCount: 0,
      maxAttempts: options.maxAttempts ?? DEFAULT_MAX_ATTEMPTS,
      amountAtRisk: payment.order.amount,
      recoveredAmount: new Prisma.Decimal(0),
      stopped: action === 'DO_NOT_RETRY',
      stopReason: action === 'DO_NOT_RETRY' ? 'NON_RECOVERABLE_FAILURE' : null,
      escalated: action === 'HUMAN_REVIEW',
      recoveryWindowEndsAt:
        action === 'AUTO_RETRY' || action === 'DELAYED_RETRY'
          ? buildRecoveryWindow(options.recoveryWindowEndsAt)
          : null,
    },
  });

  await logRecoveryEvent(
    'DIAGNOSIS_CREATED',
    paymentId,
    recovery.id,
    {
      decisionId,
      action,
      failureCategory: diagnosis.failure_category,
      recommendedAction: diagnosis.recommended_action,
      retryAfterSeconds: diagnosis.retry_after_seconds,
      maxAttempts: recovery.maxAttempts,
    },
    options.actor,
  );

  return recovery;
}

export async function enactRecovery(
  paymentId: string,
  decisionId: string,
  action: RecoveryAction,
  delaySeconds = 0,
  options: RecoveryPlanOptions = {},
) {
  const prisma = getPrismaClient();
  const recovery = await ensureRecoveryRecord(paymentId, decisionId, action, options);

  await logRecoveryEvent(
    'RECOVERY_RECOMMENDED',
    paymentId,
    recovery.id,
    {
      action,
      delaySeconds,
      maxAttempts: recovery.maxAttempts,
      queueRecovery: options.queueRecovery !== false,
    },
    options.actor,
  );

  if (action === 'HUMAN_REVIEW') {
    await PaymentService.transition(paymentId, 'HUMAN_REVIEW');
    await prisma.paymentRecovery.update({
      where: { id: recovery.id },
      data: {
        status: RecoveryStatus.HUMAN_REVIEW,
        escalated: true,
        lastAttemptAt: new Date(),
      },
    });
    const approval = await prisma.humanApproval.create({ data: { agentDecisionId: decisionId } });
    await logRecoveryEvent(
      'HUMAN_REVIEW_REQUIRED',
      paymentId,
      recovery.id,
      { approvalId: approval.id, action },
      options.actor,
    );
    return approval;
  }

  if (action === 'DO_NOT_RETRY') {
    await PaymentService.transition(paymentId, 'DO_NOT_RETRY');
    await prisma.paymentRecovery.update({
      where: { id: recovery.id },
      data: {
        status: RecoveryStatus.DO_NOT_RETRY,
        stopped: true,
        stopReason: 'NON_RECOVERABLE_FAILURE',
        completedAt: new Date(),
      },
    });
    await logRecoveryEvent(
      'RECOVERY_STOPPED',
      paymentId,
      recovery.id,
      { reason: 'NON_RECOVERABLE_FAILURE', action },
      options.actor,
    );
    return recovery;
  }

  await PaymentService.transition(paymentId, 'RECOVERY_PENDING');
  await prisma.paymentRecovery.update({
    where: { id: recovery.id },
    data: {
      status: RecoveryStatus.PENDING,
      recoveryWindowEndsAt:
        recovery.recoveryWindowEndsAt ?? buildRecoveryWindow(options.recoveryWindowEndsAt),
    },
  });

  if (options.queueRecovery !== false) {
    await prisma.outboxEvent.create({
      data: {
        aggregateType: 'payment',
        aggregateId: paymentId,
        eventType: 'payment.retry',
        payload: {
          paymentId,
          recoveryId: recovery.id,
          delaySeconds,
          maxAttempts: recovery.maxAttempts,
          scenario: options.scenario ?? null,
        },
      },
    });
  }

  await logRecoveryEvent(
    'RECOVERY_STARTED',
    paymentId,
    recovery.id,
    {
      action,
      delaySeconds,
      queueRecovery: options.queueRecovery !== false,
    },
    options.actor,
  );

  return {
    queued: options.queueRecovery !== false,
    recoveryId: recovery.id,
  };
}

export async function recordRecoveryAttempt(
  paymentId: string,
  result: { success: boolean; errorCode?: string; error?: string; actor?: string },
): Promise<RecoveryAttemptResult> {
  const prisma = getPrismaClient();
  const recovery = await prisma.paymentRecovery.findUnique({
    where: { paymentId },
    include: { payment: { include: { order: true } } },
  });
  if (!recovery) {
    throw new Error(`No recovery record found for payment ${paymentId}`);
  }
  if (recovery.stopped || recovery.status === RecoveryStatus.SUCCESS) {
    return {
      paymentId,
      recoveryId: recovery.id,
      success: recovery.status === RecoveryStatus.SUCCESS,
      shouldRetry: false,
      stopReason: recovery.stopReason,
      attemptCount: recovery.attemptCount,
    };
  }

  const nextAttemptCount = recovery.attemptCount + 1;
  const now = new Date();

  await logRecoveryEvent(
    'RETRY_ATTEMPTED',
    paymentId,
    recovery.id,
    {
      attemptCount: nextAttemptCount,
      success: result.success,
      errorCode: result.errorCode ?? null,
      error: result.error ?? null,
    },
    result.actor,
  );

  if (result.success) {
    await prisma.paymentRecovery.update({
      where: { id: recovery.id },
      data: {
        attemptCount: nextAttemptCount,
        status: RecoveryStatus.SUCCESS,
        recoveredAmount: recovery.amountAtRisk,
        stopped: true,
        stopReason: 'RECOVERY_SUCCEEDED',
        completedAt: now,
        lastAttemptAt: now,
      },
    });
    await logRecoveryEvent(
      'RECOVERY_SUCCEEDED',
      paymentId,
      recovery.id,
      {
        attemptCount: nextAttemptCount,
        recoveredAmount: Number(recovery.amountAtRisk),
      },
      result.actor,
    );
    return {
      paymentId,
      recoveryId: recovery.id,
      success: true,
      shouldRetry: false,
      stopReason: 'RECOVERY_SUCCEEDED',
      attemptCount: nextAttemptCount,
    };
  }

  const stopReason = getRecoveryStopReason({
    failureCategory: recovery.failureCategory as AgentDiagnosis['failure_category'],
    attemptCount: nextAttemptCount,
    maxAttempts: recovery.maxAttempts,
    recoverySucceeded: false,
    recoveryWindowEndsAt: recovery.recoveryWindowEndsAt,
  });
  const shouldRetry = !stopReason;

  if (stopReason) {
    await PaymentService.transition(paymentId, 'DO_NOT_RETRY');
  }

  await prisma.paymentRecovery.update({
    where: { id: recovery.id },
    data: {
      attemptCount: nextAttemptCount,
      lastAttemptAt: now,
      status: shouldRetry ? RecoveryStatus.RETRYING : RecoveryStatus.STOPPED,
      stopped: !shouldRetry,
      stopReason,
      completedAt: shouldRetry ? null : now,
    },
  });

  if (shouldRetry) {
    await logRecoveryEvent(
      'RECOVERY_FAILED',
      paymentId,
      recovery.id,
      {
        attemptCount: nextAttemptCount,
        errorCode: result.errorCode ?? null,
        nextAction: 'RETRYING',
      },
      result.actor,
    );
  } else {
    if (stopReason === 'MAX_RETRIES_REACHED') {
      await logRecoveryEvent(
        'MAX_RETRIES_REACHED',
        paymentId,
        recovery.id,
        {
          attemptCount: nextAttemptCount,
          maxAttempts: recovery.maxAttempts,
          errorCode: result.errorCode ?? null,
        },
        result.actor,
      );
    }
    await logRecoveryEvent(
      'RECOVERY_STOPPED',
      paymentId,
      recovery.id,
      {
        attemptCount: nextAttemptCount,
        reason: stopReason ?? 'UNKNOWN',
        errorCode: result.errorCode ?? null,
      },
      result.actor,
    );
  }

  return {
    paymentId,
    recoveryId: recovery.id,
    success: false,
    shouldRetry,
    stopReason,
    attemptCount: nextAttemptCount,
  };
}

export async function resolveApproval(
  id: string,
  approved: boolean,
  reviewer = 'reviewer',
  executor: PaymentProvider = getPaymentProvider(),
) {
  const prisma = getPrismaClient();
  const approval = await prisma.humanApproval.findUniqueOrThrow({
    where: { id },
    include: { agentDecision: true },
  });
  if (approval.status !== 'pending') throw new Error('Approval has already been resolved');

  const paymentId = approval.agentDecision.paymentId;
  const recovery = await prisma.paymentRecovery.findUnique({ where: { paymentId } });
  if (!recovery) throw new Error(`No recovery record found for payment ${paymentId}`);

  await prisma.humanApproval.update({
    where: { id },
    data: {
      status: approved ? 'approved' : 'rejected',
      reviewedBy: reviewer,
      reviewedAt: new Date(),
    },
  });

  if (!approved) {
    await PaymentService.transition(paymentId, 'REJECTED');
    await PaymentService.transition(paymentId, 'DO_NOT_RETRY');
    await prisma.paymentRecovery.update({
      where: { id: recovery.id },
      data: {
        status: RecoveryStatus.STOPPED,
        stopped: true,
        stopReason: 'HUMAN_REVIEW_REJECTED',
        completedAt: new Date(),
      },
    });
    await logRecoveryEvent(
      'RECOVERY_STOPPED',
      paymentId,
      recovery.id,
      { reason: 'HUMAN_REVIEW_REJECTED', reviewer },
      reviewer,
    );
    return approval;
  }

  await PaymentService.transition(paymentId, 'APPROVED');
  await prisma.paymentRecovery.update({
    where: { id: recovery.id },
    data: { status: RecoveryStatus.RETRYING, lastAttemptAt: new Date() },
  });
  const result = await PaymentService.attempt(paymentId, undefined, executor);
  const attemptResult = await recordRecoveryAttempt(paymentId, {
    success: result.success,
    errorCode: result.errorCode,
    error: result.error,
    actor: reviewer,
  });

  if (!attemptResult.success) {
    await prisma.paymentRecovery.update({
      where: { id: recovery.id },
      data: {
        status: RecoveryStatus.STOPPED,
        stopped: true,
        stopReason: 'APPROVED_RETRY_FAILED',
        completedAt: new Date(),
      },
    });
    await logRecoveryEvent(
      'RECOVERY_STOPPED',
      paymentId,
      recovery.id,
      { reason: 'APPROVED_RETRY_FAILED', reviewer },
      reviewer,
    );
  }

  return approval;
}

export async function processQueuedRecoveryRetry(params: {
  paymentId: string;
  delaySeconds?: number;
  scenario?: string | null;
  actor?: string;
  executor?: PaymentProvider;
}) {
  const paymentId = params.paymentId;
  const delaySeconds = params.delaySeconds ?? 0;
  if (delaySeconds > 0) {
    await new Promise((resolve) => setTimeout(resolve, delaySeconds * 1000));
  }

  const result = await PaymentService.attempt(
    paymentId,
    params.scenario ?? undefined,
    params.executor ?? getPaymentProvider(),
  );
  return recordRecoveryAttempt(paymentId, {
    success: result.success,
    errorCode: result.errorCode,
    error: result.error,
    actor: params.actor ?? 'payment-retry-worker',
  });
}
