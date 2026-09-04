// Mock AI provider for development/testing
import { Categories, CompiledPolicy, Limits, Merchants } from '../policy/policy.types';

/**
 * Mock Claude provider - generates plausible policies from keywords
 * Used when ANTHROPIC_API_KEY is not set or in testing
 */
export async function mockCompilePolicy(
  naturalLanguage: string
): Promise<CompiledPolicy> {
  // Simulate processing delay
  await new Promise((resolve) => setTimeout(resolve, 500));

  const text = naturalLanguage.toLowerCase();

  const policy: CompiledPolicy = {
    name: extractPolicyName(naturalLanguage),
    limits: extractLimits(text),
    categories: extractCategories(text),
    merchants: extractMerchants(text),
    timeWindow: extractTimeWindow(text),
    approval: extractApproval(text),
  };

  return policy;
}

function extractPolicyName(text: string): string {
  // Try to extract policy name from first sentence
  const match = text.match(/^([^.!?]+)/);
  if (match) {
    const name = match[1].trim();
    if (name.length < 100) return name;
  }
  return 'Agent Spending Policy';
}

function extractLimits(text: string): Limits {
  const limits: Limits = {};

  // Extract per-transaction limit
  const txMatch = text.match(/(?:(?:per\s+)?transaction|at\s+once)[:\s]+[₹$]?(\d+(?:,\d+)?)/i);
  if (txMatch) {
    limits.perTransaction = parseAmount(txMatch[1]);
  }

  // Extract daily limit
  const dailyMatch = text.match(/(?:daily|per\s+day)[:\s]+[₹$]?(\d+(?:,\d+)?)/i);
  if (dailyMatch) {
    limits.daily = parseAmount(dailyMatch[1]);
  }

  // Extract weekly limit
  const weeklyMatch = text.match(/(?:weekly|per\s+week)[:\s]+[₹$]?(\d+(?:,\d+)?)/i);
  if (weeklyMatch) {
    limits.weekly = parseAmount(weeklyMatch[1]);
  }

  // Extract monthly limit
  const monthlyMatch = text.match(/(?:monthly|per\s+month)[:\s]+[₹$]?(\d+(?:,\d+)?)/i);
  if (monthlyMatch) {
    limits.monthly = parseAmount(monthlyMatch[1]);
  }

  return limits;
}

function extractCategories(text: string): Categories {
  const categories: Categories = {
    allowed: [],
    blocked: [],
  };

  // Categories that might be allowed
  const allowedKeywords = [
    'groceries?',
    'food',
    'school',
    'education',
    'supplies?',
    'pharmacy',
    'medicine',
    'books?',
    'utilities?',
    'transport',
    'travel',
  ];

  // Categories that should be blocked
  const blockedKeywords = [
    'gaming',
    'game',
    'entertainment',
    'movies?',
    'alcohol',
    'tobacco',
    'luxury',
    'gambling',
  ];

  // Extract allowed
  for (const keyword of allowedKeywords) {
    const regex = new RegExp(
      `(?:can|allow|spend|budget)\\s+(?:on\\s+)?(?:for\\s+)?${keyword}`,
      'i'
    );
    if (regex.test(text)) {
      (categories.allowed ??= []).push(keyword.replace('?', '').replace(/s$/, ''));
    }
  }

  // Extract blocked
  for (const keyword of blockedKeywords) {
    const regex = new RegExp(
      `(?:block|no|never|don't allow)\\s+(?:on\\s+)?${keyword}`,
      'i'
    );
    if (regex.test(text)) {
      (categories.blocked ??= []).push(keyword.replace('?', ''));
    }
  }

  return categories;
}

function extractMerchants(text: string): Merchants | undefined {
  const merchants: Merchants = {};

  // Look for merchant names
  const merchantMatches = text.match(/merchant[s]?\s*[:\s]+([\w\s,]+?)(?:\.|,|$)/i);
  if (merchantMatches) {
    const names = merchantMatches[1]
      .split(',')
      .map(normalizeMerchantName)
      .filter((m) => m.length > 0);
    merchants.allowed = names;
  }

  return Object.keys(merchants).length > 0 ? merchants : undefined;
}

function extractTimeWindow(text: string) {
  const timeMatch = text.match(/(\d{1,2}):(\d{2})\s*(?:am|pm|AM|PM)?\s*-\s*(\d{1,2}):(\d{2})\s*(?:am|pm|AM|PM)?/);
  if (timeMatch) {
    return {
      start: `${timeMatch[1].padStart(2, '0')}:${timeMatch[2]}`,
      end: `${timeMatch[3].padStart(2, '0')}:${timeMatch[4]}`,
      timezone: 'UTC',
    };
  }
  return undefined;
}

function extractApproval(text: string) {
  const approvalMatch = text.match(
    /(?:approval|approve|approval required|needs? approval)\s+(?:above|above\s+|for\s+|at\s+)[₹$]?(\d+(?:,\d+)?)/i
  );
  if (approvalMatch) {
    return {
      aboveAmount: parseAmount(approvalMatch[1]),
    };
  }
  return undefined;
}

function parseAmount(amountStr: string): number {
  // Accept common INR/USD representations while retaining the number-only policy shape.
  return parseInt(amountStr.replace(/[^0-9.]/g, ''), 10);
}

function normalizeMerchantName(value: string): string {
  return value
    .replace(/^(at|from|with)\s+/i, '')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}
