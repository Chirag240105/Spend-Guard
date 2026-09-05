import { afterEach, describe, expect, it, vi } from 'vitest';
import { decideRecovery, getDefaultMaxRetryAttempts, getRecoveryStopReason } from './policy';

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('recovery policy', () => {
  it('routes transient failures to delayed retry', () => {
    expect(
      decideRecovery(
        {
          failure_category: 'GATEWAY_TIMEOUT',
          confidence: 0.92,
          risk_level: 'LOW',
          recommended_action: 'DELAYED_RETRY',
          retry_after_seconds: 30,
          reason: 'Gateway timeout',
        },
        { retryCount: 0 },
      ),
    ).toBe('DELAYED_RETRY');
  });

  it('stops retrying when the retry budget is exhausted', () => {
    expect(
      decideRecovery(
        {
          failure_category: 'TRANSIENT_NETWORK',
          confidence: 0.96,
          risk_level: 'LOW',
          recommended_action: 'AUTO_RETRY',
          retry_after_seconds: 5,
          reason: 'Network blip',
        },
        { retryCount: 3, maxAttempts: 3 },
      ),
    ).toBe('DO_NOT_RETRY');
  });

  it('sends insufficient funds to do-not-retry', () => {
    expect(
      decideRecovery(
        {
          failure_category: 'INSUFFICIENT_FUNDS',
          confidence: 0.99,
          risk_level: 'HIGH',
          recommended_action: 'DO_NOT_RETRY',
          retry_after_seconds: 0,
          reason: 'No balance',
        },
        { retryCount: 0 },
      ),
    ).toBe('DO_NOT_RETRY');
  });

  it('routes unknown failures to human review', () => {
    expect(
      decideRecovery(
        {
          failure_category: 'UNKNOWN',
          confidence: 0.4,
          risk_level: 'HIGH',
          recommended_action: 'HUMAN_REVIEW',
          retry_after_seconds: 0,
          reason: 'Uncertain failure',
        },
        { retryCount: 0 },
      ),
    ).toBe('HUMAN_REVIEW');
  });

  it('returns the correct stop reason for each bounded-recovery stop', () => {
    expect(
      getRecoveryStopReason({
        failureCategory: 'GATEWAY_TIMEOUT',
        attemptCount: 4,
        maxAttempts: 4,
        recoverySucceeded: false,
      }),
    ).toBe('MAX_RETRIES_REACHED');
    expect(
      getRecoveryStopReason({
        failureCategory: 'INSUFFICIENT_FUNDS',
        attemptCount: 1,
        maxAttempts: 4,
        recoverySucceeded: false,
      }),
    ).toBe('NON_RECOVERABLE_FAILURE');
    expect(
      getRecoveryStopReason({
        failureCategory: 'CARD_DECLINED',
        attemptCount: 1,
        maxAttempts: 4,
        recoverySucceeded: false,
        recoveryWindowEndsAt: new Date(Date.now() - 1),
      }),
    ).toBe('RECOVERY_WINDOW_EXPIRED');
  });

  it('reads the max retry cap from the environment when present', () => {
    vi.stubEnv('MAX_RETRY_ATTEMPTS', '7');
    expect(getDefaultMaxRetryAttempts()).toBe(7);
  });
});
