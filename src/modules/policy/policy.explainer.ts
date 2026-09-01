import { CompiledPolicy } from './policy.types';

/**
 * Provides a structured explanation of a policy
 */
export interface PolicyExplanation {
  limits: string[];
  allowed: string[];
  blocked: string[];
  merchants?: {
    allowed: string[];
    blocked: string[];
  };
  timeWindow?: string;
  approvalRequired?: string;
}

export function explainPolicy(policy: CompiledPolicy): PolicyExplanation {
  const explanation: PolicyExplanation = {
    limits: [],
    allowed: [],
    blocked: [],
  };

  // Explain limits
  if (policy.limits.perTransaction) {
    explanation.limits.push(
      `Per Transaction: ₹${policy.limits.perTransaction}`
    );
  }
  if (policy.limits.daily) {
    explanation.limits.push(`Daily: ₹${policy.limits.daily}`);
  }
  if (policy.limits.weekly) {
    explanation.limits.push(`Weekly: ₹${policy.limits.weekly}`);
  }
  if (policy.limits.monthly) {
    explanation.limits.push(`Monthly: ₹${policy.limits.monthly}`);
  }

  // Explain allowed categories
  if (
    policy.categories.allowed &&
    policy.categories.allowed.length > 0
  ) {
    explanation.allowed = policy.categories.allowed.map((c) =>
      c.replace(/_/g, ' ')
    );
  }

  // Explain blocked categories
  if (
    policy.categories.blocked &&
    policy.categories.blocked.length > 0
  ) {
    explanation.blocked = policy.categories.blocked.map((c) =>
      c.replace(/_/g, ' ')
    );
  }

  // Explain merchant restrictions
  if (policy.merchants) {
    explanation.merchants = {
      allowed: policy.merchants.allowed || [],
      blocked: policy.merchants.blocked || [],
    };
  }

  // Explain time window
  if (policy.timeWindow) {
    explanation.timeWindow = `${policy.timeWindow.start} - ${policy.timeWindow.end} (${policy.timeWindow.timezone || 'UTC'})`;
  }

  // Explain approval requirements
  if (policy.approval?.aboveAmount) {
    explanation.approvalRequired = `Above ₹${policy.approval.aboveAmount}`;
  }

  return explanation;
}
