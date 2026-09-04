import { describe, expect, it } from 'vitest';
import { assertPaymentTransition } from './state-machine';
describe('payment state machine', () => {
  it('allows declared transition', () =>
    expect(() => assertPaymentTransition('FAILED', 'AI_DIAGNOSIS')).not.toThrow());
  it('rejects unsafe shortcut', () =>
    expect(() => assertPaymentTransition('FAILED', 'RETRYING')).toThrow(
      'Invalid payment transition',
    ));
});
