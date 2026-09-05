import { createHmac } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { MockPaymentProvider, RazorpayPaymentProvider } from './payment-provider';

describe('RazorpayPaymentProvider signatures', () => {
  const provider = new RazorpayPaymentProvider('rzp_test_key', 'key-secret', 'webhook-secret');

  it('verifies checkout signatures and rejects altered values', () => {
    const paymentId = 'pay_test_123';
    const orderId = 'order_test_123';
    const signature = createHmac('sha256', 'key-secret').update(`${orderId}|${paymentId}`).digest('hex');
    expect(provider.verifyPaymentSignature({ orderId, paymentId, signature })).toBe(true);
    expect(provider.verifyPaymentSignature({ orderId, paymentId, signature: `${signature}x` })).toBe(false);
  });

  it('verifies the exact raw webhook body', () => {
    const body = '{"event":"payment.captured"}';
    const signature = createHmac('sha256', 'webhook-secret').update(body).digest('hex');
    expect(provider.verifyWebhookSignature(body, signature)).toBe(true);
    expect(provider.verifyWebhookSignature(`${body} `, signature)).toBe(false);
  });
});

describe('MockPaymentProvider scenarios', () => {
  const provider = new MockPaymentProvider();

  it('fails bank temporary failures for the demo recovery flow', async () => {
    const result = await provider.execute({ paymentId: 'pay_demo', scenario: 'BANK_TEMPORARY_FAILURE' });
    expect(result.success).toBe(false);
    expect(result.errorCode).toBe('BANK_TEMPORARY_FAILURE');
  });

  it('fails card declines and unknown errors deterministically', async () => {
    const declined = await provider.execute({ paymentId: 'pay_demo', scenario: 'CARD_DECLINED' });
    const unknown = await provider.execute({ paymentId: 'pay_demo', scenario: 'UNKNOWN' });
    expect(declined.success).toBe(false);
    expect(declined.errorCode).toBe('CARD_DECLINED');
    expect(unknown.success).toBe(false);
    expect(unknown.errorCode).toBe('UNKNOWN_FAILURE');
  });
});
