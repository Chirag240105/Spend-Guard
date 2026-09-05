import { CompiledPolicy } from '../policy/policy.types';

export function parseCompiledPolicy(responseText: string, provider: string): CompiledPolicy {
  const jsonMatch = responseText.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error(`${provider} did not return valid JSON`);
  }

  try {
    return normalizeCompiledPolicy(JSON.parse(jsonMatch[0])) as CompiledPolicy;
  } catch {
    throw new Error(`${provider} returned malformed JSON`);
  }
}

/** Keep provider omissions compatible with the strict policy schema. */
function normalizeCompiledPolicy(value: unknown): unknown {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return value;

  const policy = value as Record<string, unknown>;
  const limits = normalizeObject(policy.limits);
  const categories = normalizeObject(policy.categories);
  const merchants = normalizeObject(policy.merchants);
  const approval = normalizeObject(policy.approval);

  if (limits) policy.limits = removeNullFields(limits);
  if (categories) policy.categories = normalizeArrayFields(categories, ['allowed', 'blocked']);
  if (merchants) policy.merchants = normalizeArrayFields(merchants, ['allowed', 'blocked']);
  if (approval) policy.approval = normalizeArrayFields(approval, ['categories']);

  for (const key of Object.keys(policy)) {
    if (policy[key] === null) delete policy[key];
  }

  return policy;
}

function normalizeObject(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function removeNullFields(value: Record<string, unknown>) {
  for (const key of Object.keys(value)) {
    if (value[key] === null) delete value[key];
  }
  return value;
}

function normalizeArrayFields(value: Record<string, unknown>, fields: string[]) {
  for (const field of fields) {
    if (value[field] === null || value[field] === undefined) value[field] = [];
  }
  return value;
}

export async function getErrorMessage(response: Response): Promise<string> {
  const detail = await response.text();
  return detail
    ? `${response.status} ${response.statusText}: ${detail}`
    : `${response.status} ${response.statusText}`;
}
