import 'dotenv/config';
import { RazorpayAdapter } from '../src/modules/providers/payment-provider';
import { runSystemDiagnosis } from '../src/modules/agent/diagnosis';

async function main() {
  console.log('=== Step 1: System Diagnosis ===');
  const diag = await runSystemDiagnosis();
  console.log(JSON.stringify(diag, null, 2));
  if (!diag.healthy) {
    console.error('Diagnosis failed. Fix issues before proceeding.');
    process.exit(1);
  }

  console.log('\n=== Step 2: Submit Failed Test Payment ===');
  const adapter = new RazorpayAdapter(
    process.env.RAZORPAY_KEY_ID!,
    process.env.RAZORPAY_KEY_SECRET!
  );

  // Create an order
  const order = await adapter.createOrder({
    amount: 50000, // ₹500
    currency: 'INR',
    receipt: `verify_${Date.now()}`,
  });
  console.log('Order created:', order);

  // Simulate a capture failure by using a fake payment ID
  const fakePaymentId = 'pay_FakeTestFailure';
  const result = await adapter.capturePayment(fakePaymentId, order.amount);
  console.log('Capture result:', result);

  if (!result.success && result.status === 'failed') {
    console.log('\n✅ VERIFICATION PASSED: Failed payment was correctly rejected.');
  } else {
    console.log('\n❌ VERIFICATION FAILED: Expected capture to fail.');
    process.exit(1);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});