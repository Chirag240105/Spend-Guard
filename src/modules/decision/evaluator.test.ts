import { describe, it, expect } from 'vitest';
import { evaluateTransaction } from '@/src/modules/decision/evaluator';
import { CompiledPolicy } from '@/src/modules/policy/policy.types';
import { Transaction } from '@/src/modules/transaction/transaction.types';
import { SpendingContext } from '@/src/modules/decision/evaluator';

describe('Transaction Evaluator', () => {
  const policy: CompiledPolicy = {
    name: 'Test Policy',
    limits: {
      perTransaction: 500,
      daily: 2000,
      weekly: 10000,
      monthly: 50000,
    },
    categories: {
      allowed: ['groceries', 'school_supplies'],
      blocked: ['gaming', 'entertainment'],
    },
    approval: {
      aboveAmount: 500,
    },
  };

  const baseTransaction: Transaction = {
    id: 'txn_001',
    amount: 350,
    currency: 'INR',
    merchant: 'Grocery Mart',
    category: 'Groceries',
    timestamp: new Date(),
    agentId: 'agent_001',
    policyId: 'policy_001',
    createdAt: new Date(),
  };

  const spendingContext: SpendingContext = {
    dailySpent: 0,
    weeklySpent: 0,
    monthlySpent: 0,
  };

  it('should ALLOW transaction within all limits', () => {
    const result = evaluateTransaction(baseTransaction, policy, spendingContext);
    expect(result.decision).toBe('ALLOW');
  });

  it('should BLOCK transaction over per-transaction limit', () => {
    const tx = { ...baseTransaction, amount: 600 };
    const result = evaluateTransaction(tx, policy, spendingContext);
    expect(result.decision).toBe('BLOCK');
  });

  it('should BLOCK transaction in blocked category', () => {
    const tx = { ...baseTransaction, category: 'Gaming' };
    const result = evaluateTransaction(tx, policy, spendingContext);
    expect(result.decision).toBe('BLOCK');
  });

  it('should HOLD transaction over approval threshold', () => {
    const tx = { ...baseTransaction, amount: 700 };
    const result = evaluateTransaction(tx, policy, spendingContext);
    expect(result.decision).toBe('HOLD');
  });

  it('should BLOCK transaction over daily limit', () => {
    const context: SpendingContext = {
      dailySpent: 1800,
      weeklySpent: 1800,
      monthlySpent: 1800,
    };
    const result = evaluateTransaction(baseTransaction, policy, context);
    expect(result.decision).toBe('BLOCK');
  });

  it('should enforce hard block even with high confidence', () => {
    const tx = { ...baseTransaction, category: 'Entertainment' };
    const result = evaluateTransaction(tx, policy, spendingContext);
    expect(result.decision).toBe('BLOCK');
    expect(result.source).toBe('DETERMINISTIC');
  });

  it('should provide detailed rule results', () => {
    const result = evaluateTransaction(baseTransaction, policy, spendingContext);
    expect(Array.isArray(result.reasons)).toBe(true);
    expect(result.reasons.length).toBeGreaterThan(0);
    expect(result.reasons[0]).toHaveProperty('rule');
    expect(result.reasons[0]).toHaveProperty('passed');
    expect(result.reasons[0]).toHaveProperty('message');
  });
});
