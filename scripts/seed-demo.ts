import 'dotenv/config';
import { PolicyService } from '../src/modules/policy/policy.service';
import { TransactionEvaluator } from '../src/modules/transaction/transaction.evaluator';
import { PaymentService } from '../src/modules/payments/payment.service';
import { diagnoseFailedPayment } from '../src/workers/diagnosis.worker';
import { MockPaymentProvider } from '../src/modules/providers/payment-provider';
import { AuthService } from '../src/modules/auth/auth.service';
import { getPrismaClient } from '../src/infrastructure/database';
import { clearSpendingCounters, closeRedis } from '../src/infrastructure/redis';

const DEMO_POLICY_NL = `My agent can spend up to Rs 2,000 per day on groceries and school supplies.
Never spend more than Rs 500 at once.
Block gaming and entertainment.
Anything above Rs 500 needs my approval.`;

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
  expectedStatus: 'RECOVERY_PENDING' | 'HUMAN_REVIEW' | 'DO_NOT_RETRY';
  expectedAction: 'DELAYED_RETRY' | 'HUMAN_REVIEW' | 'DO_NOT_RETRY';
}> = [
  {
    scenario: 'GATEWAY_TIMEOUT',
    amount: 4999,
    label: 'Gateway Timeout -> DELAYED_RETRY',
    expectedStatus: 'RECOVERY_PENDING',
    expectedAction: 'DELAYED_RETRY',
  },
  {
    scenario: 'BANK_TEMPORARY_FAILURE',
    amount: 12500,
    label: 'Bank Temp Failure -> DELAYED_RETRY',
    expectedStatus: 'RECOVERY_PENDING',
    expectedAction: 'DELAYED_RETRY',
  },
  {
    scenario: 'INSUFFICIENT_FUNDS',
    amount: 75000,
    label: 'Insufficient Funds -> DO_NOT_RETRY',
    expectedStatus: 'DO_NOT_RETRY',
    expectedAction: 'DO_NOT_RETRY',
  },
  {
    scenario: 'CARD_DECLINED',
    amount: 3200,
    label: 'Card Declined -> HUMAN_REVIEW',
    expectedStatus: 'HUMAN_REVIEW',
    expectedAction: 'HUMAN_REVIEW',
  },
  {
    scenario: 'UNKNOWN',
    amount: 9900,
    label: 'Unknown Error -> HUMAN_REVIEW',
    expectedStatus: 'HUMAN_REVIEW',
    expectedAction: 'HUMAN_REVIEW',
  },
];

async function seedDemo() {
  const prisma = getPrismaClient();
  const failures: string[] = [];
  let healthy = true;

  const markFailure = (message: string) => {
    healthy = false;
    failures.push(message);
  };

  try {
    console.log('Starting SpendGuard demo seed...\n');

    console.log('Creating demo reviewer...');
    const demoPassword = process.env.DEMO_PASSWORD ?? 'demo1234';
    const existing = await prisma.user.findUnique({ where: { email: 'alex@spendguard.demo' } });
    if (!existing) {
      await AuthService.createUser('alex@spendguard.demo', 'Alex R.', demoPassword, 'REVIEWER');
      console.log(`   Created: alex@spendguard.demo / ${demoPassword}`);
    } else {
      console.log('   Already exists: alex@spendguard.demo');
    }

    console.log('\nClearing old demo data...');
    await prisma.decision.deleteMany({});
    await prisma.transaction.deleteMany({});
    await prisma.auditLog.deleteMany({});
    await prisma.policy.deleteMany({});
    await clearSpendingCounters('agent_001');

    console.log('\nCreating demo policy...');
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
    console.log(`   Policy ID: ${demoPolicy.id}`);

    console.log('\nRunning demo transactions...');
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
        const ok = result.decision === tx.expectedDecision;
        console.log(
          `${ok ? 'OK' : 'MISMATCH'} ₹${String(tx.amount).padEnd(5)} ${tx.merchant.padEnd(22)} -> ${result.decision}`,
        );
        if (!ok) {
          markFailure(
            `Decision mismatch for ${tx.merchant} (${tx.amount}): expected ${tx.expectedDecision}, got ${result.decision}`,
          );
        }
      } catch (error) {
        const message = `Decision seed failed for ${tx.merchant} (${tx.amount}): ${String(error)}`;
        console.error(`   ERROR ${message}`);
        markFailure(message);
      }
    }
    console.log('─'.repeat(70));

    console.log('\nSeeding payment failure and recovery scenarios...');

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
        if (result.success) {
          markFailure(`Payment scenario unexpectedly succeeded: ${s.label}`);
        } else {
          await diagnoseFailedPayment(result.paymentId);
        }

        const payment = result.paymentId
          ? await prisma.payment.findUnique({
              where: { id: result.paymentId },
              include: {
                agentDecisions: {
                  orderBy: { createdAt: 'desc' },
                },
              },
            })
          : null;

        const latestDecision = payment?.agentDecisions[0]?.policyAction ?? 'NONE';
        const statusMatches = payment?.status === s.expectedStatus;
        const actionMatches = result.success === false && latestDecision === s.expectedAction;

        if (!payment) {
          markFailure(`Could not load payment record for ${s.label}`);
        } else {
          if (!statusMatches) {
            markFailure(
              `${s.label}: expected payment status ${s.expectedStatus}, got ${payment.status}`,
            );
          }
          if (!actionMatches) {
            markFailure(
              `${s.label}: expected recovery action ${s.expectedAction}, got ${latestDecision}`,
            );
          }
        }

        console.log(`   ${(statusMatches && actionMatches) ? 'OK' : 'FAIL'} ${s.label}`);
      } catch (error) {
        const message = `Recovery seed failed for ${s.label}: ${String(error)}`;
        console.error(`   ERROR ${message}`);
        markFailure(message);
      }
    }

    const successOrder = await PaymentService.createOrder('demo-merchant', 4999, 'INR');
    const successResult = await PaymentService.createPayment(successOrder.id, 'mock', undefined, provider);
    if (!successResult.success) {
      markFailure('Baseline successful payment unexpectedly failed');
    }
    const successPayment = successResult.paymentId
      ? await prisma.payment.findUnique({ where: { id: successResult.paymentId } })
      : null;
    if (!successPayment || successPayment.status !== 'SUCCESS') {
      markFailure('Baseline successful payment was not persisted as SUCCESS');
    }
    console.log(
      `   ${(successResult.success && successPayment?.status === 'SUCCESS') ? 'OK' : 'FAIL'} ₹4,999 successful payment (baseline revenue)`,
    );

    try {
      await AuthService.login('alex@spendguard.demo', demoPassword);
      console.log('   OK auth check passed for alex@spendguard.demo');
    } catch (error) {
      const message = `Auth check failed for alex@spendguard.demo: ${String(error)}`;
      console.error(`   ERROR ${message}`);
      markFailure(message);
    }

    if (!healthy) {
      console.error('\nDemo seed finished with failures.');
      for (const failure of failures) {
        console.error(`   - ${failure}`);
      }
      process.exitCode = 1;
      return;
    }

    console.log('\nDemo seed complete!\n');
    console.log('Login credentials:');
    console.log('   Email:    alex@spendguard.demo');
    console.log(`   Password: ${demoPassword}`);
    console.log('\nStart the server:');
    console.log('   npm run dev');
    console.log('   -> http://localhost:3000\n');
  } catch (error) {
    console.error('Seed failed:', error);
    process.exit(1);
  } finally {
    await closeRedis().catch(() => {});
    await prisma.$disconnect();
  }
}

seedDemo();
