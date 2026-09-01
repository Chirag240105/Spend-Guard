import { CompiledPolicySchema, CompiledPolicy, PolicyConflict } from './policy.types';

/**
 * Detects contradictions in a compiled policy
 */
export function detectPolicyConflicts(policy: CompiledPolicy): PolicyConflict {
  const conflicts: string[] = [];

  // Check for contradictory limits
  if (
    policy.limits.perTransaction &&
    policy.limits.daily &&
    policy.limits.perTransaction > policy.limits.daily
  ) {
    conflicts.push(
      `Per-transaction limit (₹${policy.limits.perTransaction}) exceeds daily limit (₹${policy.limits.daily})`
    );
  }

  // Check for category contradictions
  if (
    policy.categories.allowed &&
    policy.categories.blocked &&
    policy.categories.allowed.length > 0 &&
    policy.categories.blocked.length > 0
  ) {
    const allowed = new Set(policy.categories.allowed.map((c) => c.toLowerCase()));
    const blocked = new Set(policy.categories.blocked.map((c) => c.toLowerCase()));
    const intersection = Array.from(allowed).filter((c) => blocked.has(c));

    if (intersection.length > 0) {
      conflicts.push(
        `Categories cannot be both allowed and blocked: ${intersection.join(', ')}`
      );
    }
  }

  // Check for merchant contradictions
  if (
    policy.merchants?.allowed &&
    policy.merchants?.blocked &&
    policy.merchants.allowed.length > 0 &&
    policy.merchants.blocked.length > 0
  ) {
    const allowed = new Set(
      policy.merchants.allowed.map((m) => m.toLowerCase())
    );
    const blocked = new Set(
      policy.merchants.blocked.map((m) => m.toLowerCase())
    );
    const intersection = Array.from(allowed).filter((m) => blocked.has(m));

    if (intersection.length > 0) {
      conflicts.push(
        `Merchants cannot be both allowed and blocked: ${intersection.join(', ')}`
      );
    }
  }

  return {
    detected: conflicts.length > 0,
    conflicts,
    message:
      conflicts.length > 0
        ? `Policy conflict detected: ${conflicts.join('. ')}`
        : 'No conflicts detected.',
  };
}

/**
 * Validates and returns a compiled policy
 */
export function validateCompiledPolicy(policy: unknown): {
  valid: boolean;
  policy: CompiledPolicy | null;
  error: string | null;
} {
  try {
    const validatedPolicy = CompiledPolicySchema.parse(policy);

    // Check for internal conflicts
    const conflicts = detectPolicyConflicts(validatedPolicy);
    if (conflicts.detected) {
      return {
        valid: false,
        policy: null,
        error: conflicts.message,
      };
    }

    return {
      valid: true,
      policy: validatedPolicy,
      error: null,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Invalid policy';
    return {
      valid: false,
      policy: null,
      error: `Policy validation failed: ${message}`,
    };
  }
}
