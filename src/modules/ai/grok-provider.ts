import { CompiledPolicy } from '../policy/policy.types';
import { buildPolicyCompilerPrompt } from './policy-prompt';
import { getErrorMessage, parseCompiledPolicy } from './provider-utils';

/** xAI Grok policy compiler (primary provider). */
export async function grokCompilePolicy(
  naturalLanguage: string,
  apiKey: string,
): Promise<CompiledPolicy> {
  const model = process.env.GROK_MODEL || 'grok-2-latest';
  const response = await fetch('https://api.x.ai/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model,
      temperature: 0,
      messages: [{ role: 'user', content: buildPolicyCompilerPrompt(naturalLanguage) }],
    }),
  });

  if (!response.ok) {
    throw new Error(`Grok API error: ${await getErrorMessage(response)}`);
  }

  const data = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const text = data.choices?.[0]?.message?.content ?? '';
  if (!text) throw new Error('Grok returned empty content');
  return parseCompiledPolicy(text, 'Grok');
}
