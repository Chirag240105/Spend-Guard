import { CompiledPolicy } from '../policy/policy.types';

export function parseCompiledPolicy(responseText: string, provider: string): CompiledPolicy {
  const jsonMatch = responseText.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error(`${provider} did not return valid JSON`);
  }

  try {
    return JSON.parse(jsonMatch[0]) as CompiledPolicy;
  } catch {
    throw new Error(`${provider} returned malformed JSON`);
  }
}

export async function getErrorMessage(response: Response): Promise<string> {
  const detail = await response.text();
  return detail
    ? `${response.status} ${response.statusText}: ${detail}`
    : `${response.status} ${response.statusText}`;
}
