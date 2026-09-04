import type { AgentDiagnosis } from '../agent/diagnosis';
export type RecoveryAction = 'AUTO_RETRY'|'DELAYED_RETRY'|'HUMAN_REVIEW'|'DO_NOT_RETRY';
export function decideRecovery(d: AgentDiagnosis, context: { retryCount: number }): RecoveryAction {
  if (d.failure_category === 'TRANSIENT_NETWORK' && d.confidence >= .9 && context.retryCount < 2 && d.risk_level === 'LOW') return 'AUTO_RETRY';
  if (['GATEWAY_TIMEOUT','BANK_TEMPORARY_FAILURE'].includes(d.failure_category) && d.confidence >= .8 && context.retryCount < 3) return 'DELAYED_RETRY';
  if (d.failure_category === 'INSUFFICIENT_FUNDS') return 'DO_NOT_RETRY';
  return 'HUMAN_REVIEW';
}
