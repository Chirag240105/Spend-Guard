import 'dotenv/config';
import { PolicyService } from '../src/modules/policy/policy.service';
import { TransactionEvaluator } from '../src/modules/transaction/transaction.evaluator';
import { PaymentService } from '../src/modules/payments/payment.service';
import { diagnoseFailedPayment } from '../src/workers/diagnosis.worker';
import { MockPaymentProvider } from '../src/modules/providers/payment-provider';
import { AuthService } from '../src/modules/auth/auth.service';
import { getPrismaClient } from '../src/infrastructure/database';
import { closeRedis } from '../src/infrastructure/redis';

const DEMO_POLICY_NL = `My agent can spend up to ₹2,000 per day on groceries and school supplies.
Never spend more than ₹500 at once.
Block gaming and entertainment.
Anything above ₹500 needs my approval.`;

const DEMO_TRANSACTIONS = [
  {
    amount: 350,
    merchant: 'Grocery Mart',
    category: 'Groceries',
    agentId: 'agent_001',
    expectedDecision: 'ALLOW',
  },
  {
    amount: 450,
    merchant: 'School Books Store',
    category: 'School Supplies',
    agentId: 'agent_001',
    expectedDecision: 'ALLOW',
  },
  {
    amount: 700,
    merchant: 'School Books Store',
    category: 'School Supplies',
    agentId: 'agent_001',
    expectedDecision: 'HOLD',
  },
  {
    amount: 900,
    merchant: 'Gaming Zone',
    category: 'Gaming',
    agentId: 'agent_001',
    expectedDecision: 'BLOCK',
  },
  {
    amount: 1500,
    merchant: 'Big Mart',
    category: 'Groceries',
    agentId: 'agent_001',
    expectedDecision: 'BLOCK',
  },
  {
    amount: 300,
    merchant: 'Pharmacy Plus',
    category: 'Pharmacy',
    agentId: 'agent_001',
    expectedDecision: 'HOLD',
  },
  {
    amount: 200,
    merchant: 'Netflix',
    category: 'Entertainment',
    agentId: 'agent_001',
    expectedDecision: 'BLOCK',
  },
  {
    amount: 450,
    merchant: 'Food Court',
    category: 'Food',
    agentId: 'agent_001',
    expectedDecision: 'HOLD',
  },
];

const DEMO_PAYMENT_SCENARIOS: Array<{
  scenario:
    | 'TRANSIENT_NETWORK'
    | 'GATEWAY_TIMEOUT'
    | 'BANK_TEMPORARY_FAILURE'
    | 'INSUFFICIENT_FUNDS'
    | 'CARD_DECLINED'
    | 'UNKNOWN';
  amount: number;
  label: string;
}> = [
  { scenario: 'GATEWAY_TIMEOUT', amount: 4999, label: 'Gateway Timeout → DELAYED_RETRY' },
  { scenario: 'BANK_TEMPORARY_FAILURE', amount: 12500, label: 'Bank Temp Failure → DELAYED_RETRY' },
  { scenario: 'INSUFFICIENT_FUNDS', amount: 75000, label: 'Insufficient Funds → DO_NOT_RETRY' },
  { scenario: 'CARD_DECLINED', amount: 3200, label: 'Card Declined → HUMAN_REVIEW' },
  { scenario: 'UNKNOWN', amount: 9900, label: 'Unknown Error → HUMAN_REVIEW' },
];

async function seedDemo() {
  const prisma = getPrismaClient();

  try {
    console.log('🌱 Starting SpendGuard demo seed...\n');

    // ── 1. Create demo reviewer ─────────────────────────────────────────────
    console.log('👤 Creating demo reviewer...');
    const demoPassword = process.env.DEMO_PASSWORD ?? 'demo1234';
    const existing = await prisma.user.findUnique({ where: { email: 'alex@spendguard.demo' } });
    if (!existing) {
      await AuthService.createUser('alex@spendguard.demo', 'Alex R.', demoPassword, 'REVIEWER');
      console.log('   ✅ Created: alex@spendguard.demo / ' + demoPassword);
    } else {
      console.log('   ℹ️  Already exists: alex@spendguard.demo');
    }

    // ── 2. Clean old policy/transaction data ────────────────────────────────
    console.log('\n🗑️  Clearing old demo data...');
    await prisma.decision.deleteMany({});
    await prisma.transaction.deleteMany({});
    await prisma.auditLog.deleteMany({});
    await prisma.policy.deleteMany({});

    // ── 3. Create demo policy ───────────────────────────────────────────────
    console.log('\n📋 Creating demo policy...');
    const demoPolicy = await PolicyService.createPolicy(
      'Agent Daily Spending Policy',
      DEMO_POLICY_NL,
      {
        name: 'Agent Daily Spending Policy',
        limits: { perTransaction: 500, daily: 2000 },
        categories: {
          allowed: ['groceries', 'school_supplies'],
          blocked: ['gaming', 'entertainment'],
        },
        approval: { aboveAmount: 500 },
      },
    );
    console.log(`   ✅ Policy ID: ${demoPolicy.id}`);

    // ── 4. Run demo transactions (policy/decision world) ────────────────────
    console.log('\n📊 Running demo transactions...');
    console.log('─'.repeat(70));
    for (const tx of DEMO_TRANSACTIONS) {
      try {
        const result = await TransactionEvaluator.evaluateTransaction({
          policyId: demoPolicy.id,
          amount: tx.amount,
          merchant: tx.merchant,
          category: tx.category,
          agentId: tx.agentId,
          currency: 'INR',
        });
        const ok = result.decision === tx.expectedDecision ? '✅' : '⚠️';
        console.log(
          `${ok} ₹${String(tx.amount).padEnd(5)} ${tx.merchant.padEnd(22)} → ${result.decision}`,
        );
      } catch (e) {
        console.error(`   ❌ ${tx.merchant}: ${String(e)}`);
      }
    }
    console.log('─'.repeat(70));

    // ── 5. Seed payment/recovery scenarios ─────────────────────────────────
    console.log('\n💳 Seeding payment failure & recovery scenarios...');

    // Create demo merchant if not exists
    let merchant = await prisma.merchant.findFirst({ where: { id: 'demo-merchant' } });
    if (!merchant) {
      merchant = await prisma.merchant.create({
        data: { id: 'demo-merchant', apiKeyHash: 'demo-key-hash', webhookUrl: null },
      });
    }

    const provider = new MockPaymentProvider();
    for (const s of DEMO_PAYMENT_SCENARIOS) {
      try {
        const order = await PaymentService.createOrder('demo-merchant', s.amount, 'INR');
        const result = await PaymentService.createPayment(order.id, 'mock', s.scenario, provider);
        if (!result.success) {
          await diagnoseFailedPayment(result.paymentId);
        }
        console.log(`   ✅ ${s.label}`);
      } catch (e) {
        console.error(`   ❌ ${s.label}: ${String(e)}`);
      }
    }

    // One successful payment for recovered revenue demo
    const successOrder = await PaymentService.createOrder('demo-merchant', 4999, 'INR');
    await PaymentService.createPayment(successOrder.id, 'mock', undefined, provider);
    console.log('   ✅ ₹4,999 successful payment (baseline revenue)');

    console.log('\n✅ Demo seed complete!\n');
    console.log('📌 Login credentials:');
    console.log(`   Email:    alex@spendguard.demo`);
    console.log(`   Password: ${demoPassword}`);
    console.log('\n🚀 Start the server:');
    console.log('   npm run dev');
    console.log('   → http://localhost:3000\n');
  } catch (error) {
    console.error('❌ Seed failed:', error);
    process.exit(1);
  } finally {
    await closeRedis().catch(() => {});
    await prisma.$disconnect();
  }
}

seedDemo();
