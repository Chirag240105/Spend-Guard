import { createHmac } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { RazorpayPaymentProvider } from './payment-provider';

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
