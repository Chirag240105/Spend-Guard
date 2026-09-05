import { Transaction } from '../transaction/transaction.types';
import { CompiledPolicy } from '../policy/policy.types';
import { DecisionResult, DecisionType, RuleEvaluation } from './decision.types';

export interface SpendingContext {
  dailySpent: number;
  weeklySpent: number;
  monthlySpent: number;
  lastReset?: {
    daily: Date;
    weekly: Date;
    monthly: Date;
  };
}

/**
 * Evaluates a transaction against a policy using deterministic rules
 * Does NOT call AI - only applies hard policy rules
 */
export function evaluateTransaction(
  transaction: Transaction,
  policy: CompiledPolicy,
  spendingContext: SpendingContext,
): DecisionResult {
  const rules: RuleEvaluation[] = [];
  const explanations: string[] = [];

  // Normalize category for comparison
  const txCategory = transaction.category.toLowerCase().replace(/\s+/g, '_');
  const txMerchant = transaction.merchant.toLowerCase();

  // Rule 1: Check per-transaction limit
  if (policy.limits.perTransaction) {
    const passed = transaction.amount <= policy.limits.perTransaction;
    rules.push({
      rule: `Per-transaction limit: ₹${policy.limits.perTransaction}`,
      passed,
      message: passed
        ? `✓ Amount (₹${transaction.amount}) within limit`
        : `✕ Amount (₹${transaction.amount}) exceeds per-transaction limit (₹${policy.limits.perTransaction})`,
    });
    if (!passed) explanations.push(rules[rules.length - 1].message);
  }

  // Rule 2: Check daily limit
  if (policy.limits.daily) {
    const newDaily = spendingContext.dailySpent + transaction.amount;
    const passed = newDaily <= policy.limits.daily;
    rules.push({
      rule: `Daily limit: ₹${policy.limits.daily}`,
      passed,
      message: passed
        ? `✓ Daily total (₹${newDaily}) within limit`
        : `✕ Daily total (₹${newDaily}) exceeds daily limit (₹${policy.limits.daily})`,
    });
    if (!passed) explanations.push(rules[rules.length - 1].message);
  }

  // Rule 3: Check weekly limit
  if (policy.limits.weekly) {
    const newWeekly = spendingContext.weeklySpent + transaction.amount;
    const passed = newWeekly <= policy.limits.weekly;
    rules.push({
      rule: `Weekly limit: ₹${policy.limits.weekly}`,
      passed,
      message: passed
        ? `✓ Weekly total (₹${newWeekly}) within limit`
        : `✕ Weekly total (₹${newWeekly}) exceeds weekly limit (₹${policy.limits.weekly})`,
    });
    if (!passed) explanations.push(rules[rules.length - 1].message);
  }

  // Rule 4: Check monthly limit
  if (policy.limits.monthly) {
    const newMonthly = spendingContext.monthlySpent + transaction.amount;
    const passed = newMonthly <= policy.limits.monthly;
    rules.push({
      rule: `Monthly limit: ₹${policy.limits.monthly}`,
      passed,
      message: passed
        ? `✓ Monthly total (₹${newMonthly}) within limit`
        : `✕ Monthly total (₹${newMonthly}) exceeds monthly limit (₹${policy.limits.monthly})`,
    });
    if (!passed) explanations.push(rules[rules.length - 1].message);
  }

  // Rule 5: Check blocked categories - HARD BLOCK
  if (policy.categories.blocked && policy.categories.blocked.length > 0) {
    const isBlocked = policy.categories.blocked.some(
      (c) => c.toLowerCase().replace(/\s+/g, '_') === txCategory,
    );
    rules.push({
      rule: 'Blocked category check',
      passed: !isBlocked,
      message: isBlocked
        ? `✕ Category "${transaction.category}" is explicitly blocked`
        : `✓ Category "${transaction.category}" is not blocked`,
    });
    if (isBlocked) explanations.push(rules[rules.length - 1].message);
  }

  // Rule 6: Check allowed categories - if allowlist exists, enforce it
  if (policy.categories.allowed && policy.categories.allowed.length > 0) {
    const isAllowed = policy.categories.allowed.some(
      (c) => c.toLowerCase().replace(/\s+/g, '_') === txCategory,
    );
    rules.push({
      rule: 'Allowed category check',
      passed: isAllowed,
      message: isAllowed
        ? `✓ Category "${transaction.category}" is allowed`
        : `✕ Category "${transaction.category}" is not in allowed list`,
    });
    if (!isAllowed) explanations.push(rules[rules.length - 1].message);
  }

  // Rule 7: Check blocked merchants
  if (policy.merchants?.blocked && policy.merchants.blocked.length > 0) {
    const isMerchantBlocked = policy.merchants.blocked.some((m) => m.toLowerCase() === txMerchant);
    rules.push({
      rule: 'Blocked merchant check',
      passed: !isMerchantBlocked,
      message: isMerchantBlocked
        ? `✕ Merchant "${transaction.merchant}" is blocked`
        : `✓ Merchant "${transaction.merchant}" is not blocked`,
    });
    if (isMerchantBlocked) explanations.push(rules[rules.length - 1].message);
  }

  // Rule 8: Check allowed merchants - if allowlist exists, enforce it
  if (policy.merchants?.allowed && policy.merchants.allowed.length > 0) {
    const isMerchantAllowed = policy.merchants.allowed.some((m) => m.toLowerCase() === txMerchant);
    rules.push({
      rule: 'Allowed merchant check',
      passed: isMerchantAllowed,
      message: isMerchantAllowed
        ? `✓ Merchant "${transaction.merchant}" is allowed`
        : `✕ Merchant "${transaction.merchant}" is not in allowed list`,
    });
    if (!isMerchantAllowed) explanations.push(rules[rules.length - 1].message);
  }

  // Rule 9: Check approval threshold - HOLD if above threshold
  let requiresApproval = false;
  if (policy.approval?.aboveAmount) {
    const exceedsThreshold = transaction.amount > policy.approval.aboveAmount;
    rules.push({
      rule: `Approval threshold: ₹${policy.approval.aboveAmount}`,
      passed: !exceedsThreshold,
      message: exceedsThreshold
        ? `⚠ Amount (₹${transaction.amount}) exceeds approval threshold (₹${policy.approval.aboveAmount})`
        : `✓ Amount (₹${transaction.amount}) within approval threshold`,
    });
    if (exceedsThreshold) requiresApproval = true;
  }

  // Rule 10: Check an optional policy time window. Outside the window is held
  // for review rather than silently authorised; windows that cross midnight work.
  if (policy.timeWindow) {
    const now = new Date();
    const parts = new Intl.DateTimeFormat('en-GB', {
      timeZone: policy.timeWindow.timezone || 'UTC',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    }).formatToParts(now);
    const value = (name: string) => Number(parts.find((part) => part.type === name)?.value ?? '0');
    const current = value('hour') * 60 + value('minute');
    const toMinutes = (time: string) => {
      const [hour, minute] = time.split(':').map(Number);
      return hour * 60 + minute;
    };
    const start = toMinutes(policy.timeWindow.start);
    const end = toMinutes(policy.timeWindow.end);
    const inside =
      start <= end ? current >= start && current <= end : current >= start || current <= end;
    rules.push({
      rule: `Time window: ${policy.timeWindow.start}-${policy.timeWindow.end} ${policy.timeWindow.timezone || 'UTC'}`,
      passed: inside,
      message: inside
        ? 'Transaction is within the permitted time window'
        : 'Transaction is outside the permitted time window',
    });
    if (!inside) explanations.push(rules[rules.length - 1].message);
  }

  // Determine final decision
  // Rules:
  // BLOCK  — blocked category, blocked merchant, OR exceeded daily/weekly/monthly limit
  // HOLD   — per-transaction limit exceeded (human can still approve), approval threshold, unknown category, time window
  // ALLOW  — all checks pass
  let decision: DecisionType = 'ALLOW';

  const hasBlockedCategory = rules.some((r) => !r.passed && r.rule === 'Blocked category check');
  const hasBlockedMerchant = rules.some((r) => !r.passed && r.rule === 'Blocked merchant check');
  const hasPeriodLimitFailure = rules.some(
    (r) =>
      !r.passed &&
      (r.rule.startsWith('Daily limit') ||
        r.rule.startsWith('Weekly limit') ||
        r.rule.startsWith('Monthly limit')),
  );
  // Per-transaction over-limit → HOLD if approval threshold is configured, else BLOCK
  const hasPerTxLimitFailure = rules.some(
    (r) => !r.passed && r.rule.startsWith('Per-transaction limit'),
  );
  const hasUnknownCategory = rules.some((r) => !r.passed && r.rule === 'Allowed category check');
  const hasTimeWindowFailure = rules.some((r) => !r.passed && r.rule.startsWith('Time window'));

  if (hasBlockedCategory || hasBlockedMerchant || hasPeriodLimitFailure) {
    decision = 'BLOCK';
  } else if (requiresApproval || hasUnknownCategory || hasTimeWindowFailure) {
    decision = 'HOLD';
  } else if (hasPerTxLimitFailure) {
    decision = 'BLOCK';
  }

  return {
    decision,
    reasons: rules,
    source: 'DETERMINISTIC',
    explanation:
      explanations.length > 0
        ? explanations.join('. ')
        : decision === 'ALLOW'
          ? 'Transaction approved by policy rules'
          : decision === 'HOLD'
            ? 'Transaction requires human review'
            : 'Transaction blocked by policy',
  };
}
