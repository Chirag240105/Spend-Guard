import { Categories, CompiledPolicy, Limits, Merchants } from '../policy/policy.types';

/** Deterministic local compiler used when a live AI provider is unavailable. */
export async function mockCompilePolicy(naturalLanguage: string): Promise<CompiledPolicy> {
  await new Promise((resolve) => setTimeout(resolve, 500));
  const text = naturalLanguage.toLowerCase();
  return {
    name: extractPolicyName(naturalLanguage),
    limits: extractLimits(text),
    categories: extractCategories(text),
    merchants: extractMerchants(text),
    timeWindow: extractTimeWindow(text),
    approval: extractApproval(text),
  };
}

function extractPolicyName(text: string) { return text.match(/^([^.!?]+)/)?.[1].trim().slice(0, 99) || 'Agent Spending Policy'; }
function parseAmount(value: string) { return parseInt(value.replace(/[^0-9.]/g, ''), 10); }

function extractLimits(text: string): Limits {
  const limits: Limits = {};
  // Treat a currency marker as generic non-numeric text: this supports INR,
  // USD, and strings that have passed through a lossy text encoding.
  const value = '(\\d+(?:,\\d+)?)';
  const currency = '[^0-9]{0,4}';
  const patterns: Array<[keyof Limits, RegExp]> = [
    ['perTransaction', new RegExp(`(?:never\\s+)?spend\\s+more\\s+than\\s*${currency}${value}\\s*(?:at\\s+once|per\\s+transaction)|(?:per\\s+transaction|at\\s+once)\\s*[:\\s]*${currency}${value}`, 'i')],
    ['daily', new RegExp(`(?:up\\s+to\\s+)?${currency}${value}\\s*(?:per\\s+day|daily)`, 'i')],
    ['weekly', new RegExp(`(?:up\\s+to\\s+)?${currency}${value}\\s*(?:per\\s+week|weekly)`, 'i')],
    ['monthly', new RegExp(`(?:up\\s+to\\s+)?${currency}${value}\\s*(?:per\\s+month|monthly)`, 'i')],
  ];
  for (const [field, pattern] of patterns) { const match = pattern.exec(text); if (match) limits[field] = parseAmount(match[1] ?? match[2]); }
  return limits;
}

function extractCategories(text: string): Categories {
  const categories: Categories = { allowed: [], blocked: [] };
  const allowed = ['groceries?', 'food', 'school', 'education', 'supplies?', 'pharmacy', 'medicine', 'books?', 'utilities?', 'transport', 'travel'];
  const blocked = ['gaming', 'game', 'entertainment', 'movies?', 'alcohol', 'tobacco', 'luxury', 'gambling'];
  for (const keyword of allowed) if (new RegExp(`(?:can|allow|spend|budget)\\s+(?:on\\s+)?(?:for\\s+)?${keyword}`, 'i').test(text)) categories.allowed?.push(keyword.replace('?', '').replace(/s$/, ''));
  for (const keyword of blocked) if (new RegExp(`(?:block|no|never|don't allow)\\s+(?:on\\s+)?${keyword}`, 'i').test(text)) categories.blocked?.push(keyword.replace('?', ''));
  return categories;
}

function extractMerchants(text: string): Merchants | undefined {
  const match = text.match(/merchant[s]?\s*[:\s]+([\w\s,]+?)(?:\.|,|$)/i);
  if (!match) return undefined;
  return { allowed: match[1].split(',').map(normalizeMerchantName).filter(Boolean) };
}
function extractTimeWindow(text: string) {
  const match = text.match(/(\d{1,2}):(\d{2})\s*(?:am|pm)?\s*-\s*(\d{1,2}):(\d{2})\s*(?:am|pm)?/i);
  return match ? { start: `${match[1].padStart(2, '0')}:${match[2]}`, end: `${match[3].padStart(2, '0')}:${match[4]}`, timezone: 'UTC' } : undefined;
}
function extractApproval(text: string) {
  const match = /(?:anything\s+)?above\s+[^0-9]{0,4}(\d+(?:,\d+)?)(?:\s+needs?(?:\s+my)?\s+approval|\s+approval)?|(?:approval|approve|approval required|needs? approval)\s+(?:above|for|at)\s*[^0-9]{0,4}(\d+(?:,\d+)?)/i.exec(text);
  return match ? { aboveAmount: parseAmount(match[1] ?? match[2]) } : undefined;
}
function normalizeMerchantName(value: string) { return value.replace(/^(at|from|with)\s+/i, '').replace(/\s+/g, ' ').trim().replace(/\b\w/g, (letter) => letter.toUpperCase()); }
