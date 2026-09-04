import { createHmac, timingSafeEqual } from 'crypto';

export interface PaymentResult {
  success: boolean;
  paymentId?: string;
  orderId?: string;
  status: 'captured' | 'failed' | 'pending' | 'blocked';
  errorMessage?: string;
  rawResponse?: unknown;
}

export interface PaymentRequest {
  amount: number;
  currency: string;
  receipt: string;
  notes?: Record<string, string>;
}

export interface PaymentExecutionResult {
  success: boolean;
  errorCode?: string;
  error?: string;
  paymentId?: string;
  orderId?: string;
  status?: PaymentResult['status'];
  rawResponse?: unknown;
}

export interface PaymentProvider {
  name: string;
  mode: 'mock' | 'razorpay-test';
  createOrder(request: PaymentRequest): Promise<{ orderId: string; amount: number; currency: string }>;
  capturePayment(paymentId: string, amount: number): Promise<PaymentResult>;
  verifyPaymentSignature(params: { orderId: string; paymentId: string; signature: string }): boolean;
  verifyWebhookSignature(payload: string | Buffer, signature: string): boolean;
  execute(params: { paymentId: string; scenario?: string }): Promise<PaymentExecutionResult>;
}

const SUPPORTED_CURRENCIES = new Set(['INR']);

function normalizeNotes(notes?: Record<string, string>): Record<string, string> | undefined {
  if (!notes) return undefined;
  const entries = Object.entries(notes)
    .map(([key, value]) => [key.trim().slice(0, 256), value.trim().slice(0, 256)] as const)
    .filter(([key, value]) => key.length > 0 && value.length > 0);
  return entries.length ? Object.fromEntries(entries) : undefined;
}

function createSignature(secret: string, payload: string) {
  return createHmac('sha256', secret).update(payload).digest('hex');
}

function signaturesEqual(expected: string, actual: string) {
  const expectedBytes = Buffer.from(expected, 'utf8');
  const actualBytes = Buffer.from(actual, 'utf8');
  return expectedBytes.length === actualBytes.length && timingSafeEqual(expectedBytes, actualBytes);
}

/** Razorpay Test Mode adapter. */
export class RazorpayPaymentProvider implements PaymentProvider {
  name = 'Razorpay';
  mode = 'razorpay-test' as const;
  private baseUrl = 'https://api.razorpay.com/v1';

  constructor(
    private readonly keyId: string,
    private readonly keySecret: string,
    private readonly webhookSecret = '',
  ) {}

  private authHeader(): string {
    return 'Basic ' + Buffer.from(`${this.keyId}:${this.keySecret}`).toString('base64');
  }

  verifyPaymentSignature({
    orderId,
    paymentId,
    signature,
  }: {
    orderId: string;
    paymentId: string;
    signature: string;
  }): boolean {
    return signaturesEqual(createSignature(this.keySecret, `${orderId}|${paymentId}`), signature);
  }

  verifyWebhookSignature(payload: string | Buffer, signature: string): boolean {
    const content = typeof payload === 'string' ? payload : payload.toString('utf8');
    return signaturesEqual(createSignature(this.webhookSecret, content), signature);
  }

  async createOrder(
    request: PaymentRequest,
  ): Promise<{ orderId: string; amount: number; currency: string }> {
    if (request.amount <= 0) throw new Error('Amount must be greater than zero');
    const currency = request.currency.toUpperCase();
    if (!SUPPORTED_CURRENCIES.has(currency)) {
      throw new Error(`Unsupported currency: ${request.currency}`);
    }

    const response = await fetch(`${this.baseUrl}/orders`, {
      method: 'POST',
      headers: {
        Authorization: this.authHeader(),
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        amount: request.amount,
        currency,
        receipt: request.receipt,
        notes: normalizeNotes(request.notes),
      }),
    });
    const data = (await response.json()) as {
      id?: string;
      amount?: number;
      currency?: string;
      error?: { description?: string };
    };
    if (!response.ok || !data.id) {
      throw new Error(data.error?.description || `Razorpay order creation failed: ${response.status}`);
    }
    return {
      orderId: data.id,
      amount: data.amount ?? request.amount,
      currency: data.currency ?? currency,
    };
  }

  async capturePayment(paymentId: string, amount: number): Promise<PaymentResult> {
    const response = await fetch(`${this.baseUrl}/payments/${paymentId}/capture`, {
      method: 'POST',
      headers: {
        Authorization: this.authHeader(),
        'content-type': 'application/json',
      },
      body: JSON.stringify({ amount }),
    });
    const data = (await response.json()) as {
      id?: string;
      order_id?: string;
      status?: string;
      error?: { description?: string };
    };
    if (!response.ok) {
      return {
        success: false,
        status: 'failed',
        errorMessage: data.error?.description || `Capture failed: ${response.status}`,
        rawResponse: data,
      };
    }
    return {
      success: data.status === 'captured',
      paymentId: data.id,
      orderId: data.order_id,
      status: data.status === 'captured' ? 'captured' : 'pending',
      rawResponse: data,
    };
  }

  async execute(params: { paymentId: string; scenario?: string }): Promise<PaymentExecutionResult> {
    return { success: true, paymentId: params.paymentId, status: 'captured' };
  }
}

// Compatibility export for older diagnosis code and integrations.
export { RazorpayPaymentProvider as RazorpayAdapter };

/** Mock provider for local dev and deterministic demo scenarios. */
export class MockPaymentProvider implements PaymentProvider {
  name = 'Mock';
  mode = 'mock' as const;

  async createOrder(
    request: PaymentRequest,
  ): Promise<{ orderId: string; amount: number; currency: string }> {
    return {
      orderId: `mock_order_${Date.now()}`,
      amount: request.amount,
      currency: request.currency.toUpperCase(),
    };
  }

  async capturePayment(paymentId: string, amount: number): Promise<PaymentResult> {
    return {
      success: true,
      status: 'captured',
      paymentId,
      orderId: `mock_order_${amount}`,
    };
  }

  verifyPaymentSignature(): boolean {
    return true;
  }

  verifyWebhookSignature(): boolean {
    return true;
  }

  async execute(params: { paymentId: string; scenario?: string }): Promise<PaymentExecutionResult> {
    if (params.scenario === 'TRANSIENT_NETWORK') {
      return {
        success: false,
        errorCode: 'TRANSIENT_NETWORK',
        error: 'Network timeout during gateway request',
      };
    }
    if (params.scenario === 'INSUFFICIENT_FUNDS') {
      return {
        success: false,
        errorCode: 'INSUFFICIENT_FUNDS',
        error: 'Customer account has insufficient funds',
      };
    }
    if (params.scenario === 'GATEWAY_TIMEOUT') {
      return { success: false, errorCode: 'GATEWAY_TIMEOUT', error: 'Payment gateway timeout' };
    }
    if (params.scenario === 'FAIL') {
      return { success: false, errorCode: 'UNKNOWN_FAILURE', error: 'Transaction failed' };
    }
    return { success: true, paymentId: params.paymentId, status: 'captured' };
  }
}

export function getPaymentProvider(): PaymentProvider {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (keyId && keySecret && webhookSecret) {
    return new RazorpayPaymentProvider(keyId, keySecret, webhookSecret);
  }
  return new MockPaymentProvider();
}

export function getConfiguredPaymentProviderKind(): PaymentProvider['mode'] {
  return process.env.RAZORPAY_KEY_ID &&
    process.env.RAZORPAY_KEY_SECRET &&
    process.env.RAZORPAY_WEBHOOK_SECRET
    ? 'razorpay-test'
    : 'mock';
}
