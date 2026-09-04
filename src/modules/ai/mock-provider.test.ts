import { describe, it, expect } from 'vitest';
import { mockCompilePolicy } from '@/src/modules/ai/mock-provider';

describe('Mock Policy Compiler', () => {
  it('should extract daily limit', async () => {
    const nl = 'My agent can spend ₹2,000 per day on groceries';
    const policy = await mockCompilePolicy(nl);
    expect(policy.limits.daily).toBe(2000);
  });

  it('should extract per-transaction limit', async () => {
    const nl = 'Never spend more than ₹500 at once';
    const policy = await mockCompilePolicy(nl);
    expect(policy.limits.perTransaction).toBe(500);
  });

  it('should extract allowed categories', async () => {
    const nl = 'Can spend on groceries and education';
    const policy = await mockCompilePolicy(nl);
    expect(policy.categories.allowed).toContain('grocerie');
  });

  it('should extract blocked categories', async () => {
    const nl = 'Block gaming and entertainment';
    const policy = await mockCompilePolicy(nl);
    expect(policy.categories.blocked).toContain('gaming');
  });

  it('should extract approval threshold', async () => {
    const nl = 'Anything above ₹500 needs my approval';
    const policy = await mockCompilePolicy(nl);
    expect(policy.approval?.aboveAmount).toBe(500);
  });

  it('should handle multiple constraints', async () => {
    const nl = `Can spend ₹2,000 per day on groceries and school supplies.
                Never spend more than ₹500 at once.
                Block gaming and entertainment.
                Anything above ₹500 needs approval.`;
    const policy = await mockCompilePolicy(nl);

    expect(policy.limits.daily).toBe(2000);
    expect(policy.limits.perTransaction).toBe(500);
    expect(policy.categories.blocked).toContain('gaming');
    expect(policy.approval?.aboveAmount).toBe(500);
  });

  it('should handle empty input gracefully', async () => {
    const nl = 'No specific constraints here';
    const policy = await mockCompilePolicy(nl);
    expect(policy.name).toBeDefined();
    expect(policy.limits).toBeDefined();
    expect(policy.categories).toBeDefined();
  });
});
