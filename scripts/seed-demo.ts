/**
 * Demo seed script - Creates sample policies and transactions
 * Run this after database is initialized
 */

import { PolicyService } from './src/modules/policy/policy.service';
import { TransactionEvaluator } from './src/modules/transaction/transaction.evaluator';
import { getPrismaClient } from './src/infrastructure/database';
import { closeRedis } from './src/infrastructure/redis';

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
    expectedDecision: 'HOLD', // Unknown category
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
    expectedDecision: 'HOLD', // Over approval threshold
  },
];

async function seedDemo() {
  const prisma = getPrismaClient();

  try {
    console.log('🌱 Starting demo seed...');

    // Clear existing data
    console.log('Clearing existing data...');
    await prisma.decision.deleteMany({});
    await prisma.transaction.deleteMany({});
    await prisma.auditLog.deleteMany({});
    await prisma.policy.deleteMany({});

    // Create demo policy (using mock compiler for consistency)
    console.log('Creating demo policy...');
    const demoPolicy = await PolicyService.createPolicy(
      'Agent Daily Spending Policy',
      DEMO_POLICY_NL,
      {
        name: 'Agent Daily Spending Policy',
        limits: {
          perTransaction: 500,
          daily: 2000,
        },
        categories: {
          allowed: ['groceries', 'school_supplies'],
          blocked: ['gaming', 'entertainment'],
        },
        approval: {
          aboveAmount: 500,
        },
      }
    );

    console.log(`✅ Created policy: ${demoPolicy.id}`);
    console.log(`   Name: ${demoPolicy.name}`);
    console.log(`   Natural Language: ${demoPolicy.naturalLanguage.substring(0, 50)}...`);

    // Run demo transactions
    console.log('\n📊 Running demo transactions...');
    console.log('─'.repeat(80));

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

        const status =
          result.decision === tx.expectedDecision ? '✅' : '⚠️';
        console.log(
          `${status} ₹${tx.amount.toString().padEnd(4)} | ${tx.merchant.padEnd(25)} | ${result.decision}`
        );
        console.log(
          `   ${result.explanation.substring(0, 60)}...`
        );
      } catch (error) {
        console.error(`❌ Transaction failed: ${String(error)}`);
      }
    }

    console.log('─'.repeat(80));
    console.log('\n✅ Demo seed completed successfully!');
    console.log(`\n📌 Policy ID: ${demoPolicy.id}`);
    console.log(`📌 Policy Name: ${demoPolicy.name}`);
    console.log(`\n🚀 Next steps:`);
    console.log(`   1. Start the dev server: npm run dev`);
    console.log(`   2. Open http://localhost:3000`);
    console.log(`   3. Use policy ID in API calls`);
  } catch (error) {
    console.error('❌ Seed failed:', error);
    process.exit(1);
  } finally {
    await closeRedis();
    await prisma.$disconnect();
  }
}

seedDemo();
