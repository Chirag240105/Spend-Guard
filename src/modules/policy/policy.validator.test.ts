import { describe, it, expect } from 'vitest';
import { validateCompiledPolicy, detectPolicyConflicts } from '@/src/modules/policy/policy.validator';
import { CompiledPolicy } from '@/src/modules/policy/policy.types';

describe('Policy Validator', () => {
  it('should validate a correct policy', () => {
    const policy: CompiledPolicy = {
      name: 'Test Policy',
      limits: {
        perTransaction: 500,
        daily: 2000,
      },
      categories: {
        allowed: ['groceries'],
        blocked: ['gaming'],
      },
    };

    const result = validateCompiledPolicy(policy);
    expect(result.valid).toBe(true);
    expect(result.policy).toBeDefined();
    expect(result.error).toBeNull();
  });

  it('should detect per-transaction limit exceeding daily limit', () => {
    const policy: CompiledPolicy = {
      name: 'Invalid Policy',
      limits: {
        perTransaction: 3000,
        daily: 2000,
      },
      categories: {},
    };

    const result = validateCompiledPolicy(policy);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('conflict');
  });

  it('should detect category contradictions', () => {
    const policy: CompiledPolicy = {
      name: 'Conflicting Policy',
      limits: {},
      categories: {
        allowed: ['gaming', 'groceries'],
        blocked: ['gaming', 'entertainment'],
      },
    };

    const result = validateCompiledPolicy(policy);
    expect(result.valid).toBe(false);
  });

  it('should allow policy with only limits', () => {
    const policy: CompiledPolicy = {
      name: 'Simple Policy',
      limits: {
        daily: 5000,
      },
      categories: {},
    };

    const result = validateCompiledPolicy(policy);
    expect(result.valid).toBe(true);
  });

  it('should allow policy with optional fields null', () => {
    const policy: CompiledPolicy = {
      name: 'Minimal Policy',
      limits: {},
      categories: {
        allowed: [],
        blocked: [],
      },
    };

    const result = validateCompiledPolicy(policy);
    expect(result.valid).toBe(true);
  });
});
