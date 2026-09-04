export interface PaymentResult {
  success: boolean;
  paymentId?: string;
  orderId?: string;
  status: 'captured' | 'failed' | 'pending' | 'blocked';
  errorMessage?: string;
  rawResponse?: unknown;
}

export interface PaymentRequest {
  amount: number; // in paise (INR)
  currency: string;
  receipt: string;
  notes?: Record<string, string>;
}

export interface PaymentExecutionResult {
  success: boolean;
  errorCode?: string;
  error?: string;
}

export interface PaymentProvider {
  name: string;
  createOrder(request: PaymentRequest): Promise<{ orderId: string; amount: number }>;
  capturePayment(paymentId: string, amount: number): Promise<PaymentResult>;
  verifyWebhook(payload: unknown, signature: string): boolean;
  execute(params: { paymentId: string; scenario?: string }): Promise<PaymentExecutionResult>;
}

/** Razorpay Test Mode Adapter */
export class RazorpayAdapter implements PaymentProvider {
  name = 'Razorpay';
  private keyId: string;
  private keySecret: string;
  private baseUrl = 'https://api.razorpay.com/v1';

  constructor(keyId: string, keySecret: string) {
    this.keyId = keyId;
    this.keySecret = keySecret;
  }

  private authHeader(): string {
    return 'Basic ' + Buffer.from(`${this.keyId}:${this.keySecret}`).toString('base64');
  }

  async createOrder(request: PaymentRequest): Promise<{ orderId: string; amount: number }> {
    const response = await fetch(`${this.baseUrl}/orders`, {
      method: 'POST',
      headers: {
        Authorization: this.authHeader(),
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        amount: request.amount,
        currency: request.currency,
        receipt: request.receipt,
        notes: request.notes,
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`Razorpay order creation failed: ${response.status} ${err}`);
    }

    const data = (await response.json()) as { id: string; amount: number };
    return { orderId: data.id, amount: data.amount };
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
      status: data.status === 'captured' ? 'captured' : 'pending',
      rawResponse: data,
    };
  }

  verifyWebhook(): boolean {
    // TODO: Implement HMAC-SHA256 verification in production
    return true;
  }

  async execute(): Promise<PaymentExecutionResult> {
    return { success: true };
  }
}

/** Mock provider for local dev (no real charges). */
export class MockPaymentProvider implements PaymentProvider {
  name = 'Mock';
  async createOrder(request: PaymentRequest): Promise<{ orderId: string; amount: number }> {
    return { orderId: `mock_order_${Date.now()}`, amount: request.amount };
  }
  async capturePayment(): Promise<PaymentResult> {
    return { success: true, status: 'captured', paymentId: `mock_pay_${Date.now()}` };
  }
  verifyWebhook(): boolean {
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
    return { success: true };
  }
}

/** Factory: picks Razorpay if credentials exist, else Mock. */
export function getPaymentProvider(): PaymentProvider {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (keyId && keySecret) {
    return new RazorpayAdapter(keyId, keySecret);
  }
  return new MockPaymentProvider();
}
