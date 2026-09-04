import { describe, expect, it } from 'vitest';
import { decideRecovery } from './policy';
import type { AgentDiagnosis } from '../agent/diagnosis';
const diagnosis = (failure_category: AgentDiagnosis['failure_category'], confidence = .99, risk_level: AgentDiagnosis['risk_level'] = 'LOW'): AgentDiagnosis => ({ failure_category, confidence, risk_level, recommended_action: 'AUTO_RETRY', retry_after_seconds: 0, reason: 'test' });
describe('deterministic recovery policy', () => {
 it('auto retries only safe transient failures', () => expect(decideRecovery(diagnosis('TRANSIENT_NETWORK', .9), { retryCount: 1 })).toBe('AUTO_RETRY'));
 it('delays gateway or bank failures', () => expect(decideRecovery(diagnosis('GATEWAY_TIMEOUT', .8), { retryCount: 2 })).toBe('DELAYED_RETRY'));
 it('does not retry insufficient funds', () => expect(decideRecovery(diagnosis('INSUFFICIENT_FUNDS'), { retryCount: 0 })).toBe('DO_NOT_RETRY'));
 it('defaults uncertain diagnoses to review', () => expect(decideRecovery(diagnosis('CARD_DECLINED'), { retryCount: 0 })).toBe('HUMAN_REVIEW'));
});
