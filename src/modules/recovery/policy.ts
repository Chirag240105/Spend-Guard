import type { AgentDiagnosis } from '../agent/diagnosis';
export type RecoveryAction = 'AUTO_RETRY' | 'DELAYED_RETRY' | 'HUMAN_REVIEW' | 'DO_NOT_RETRY';
export function getDefaultMaxRetryAttempts(): number {
  const configured = Number(process.env.MAX_RETRY_ATTEMPTS ?? 3);
  return Number.isFinite(configured) && configured > 0 ? Math.floor(configured) : 3;
}

export function decideRecovery(
  d: AgentDiagnosis,
  context: { retryCount: number; maxAttempts?: number },
): RecoveryAction {
  const maxAttempts = context.maxAttempts ?? getDefaultMaxRetryAttempts();
  if (context.retryCount >= maxAttempts) return 'DO_NOT_RETRY';
  switch (d.failure_category) {
    case 'TRANSIENT_NETWORK':
    case 'GATEWAY_TIMEOUT':
    case 'BANK_TEMPORARY_FAILURE':
      return 'DELAYED_RETRY';
    case 'INSUFFICIENT_FUNDS':
      return 'DO_NOT_RETRY';
    case 'CARD_DECLINED':
    case 'UNKNOWN':
    default:
      return 'HUMAN_REVIEW';
  }
}

export function getRecoveryStopReason(params: {
  failureCategory: AgentDiagnosis['failure_category'];
  attemptCount: number;
  maxAttempts: number;
  recoverySucceeded?: boolean;
  recoveryWindowEndsAt?: Date | null;
}): string | null {
  if (params.recoverySucceeded) return 'RECOVERY_SUCCEEDED';
  if (params.failureCategory === 'INSUFFICIENT_FUNDS') return 'NON_RECOVERABLE_FAILURE';
  if (params.recoveryWindowEndsAt && params.recoveryWindowEndsAt.getTime() < Date.now()) {
    return 'RECOVERY_WINDOW_EXPIRED';
  }
  if (params.attemptCount >= params.maxAttempts) return 'MAX_RETRIES_REACHED';
  return null;
}
