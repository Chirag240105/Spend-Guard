import { CompiledPolicy } from '../policy/policy.types';
import { buildPolicyCompilerPrompt } from './policy-prompt';
import { getErrorMessage, parseCompiledPolicy } from './provider-utils';

/** xAI Grok policy compiler (primary provider). */
export async function grokCompilePolicy(naturalLanguage: string, apiKey: string): Promise<CompiledPolicy> {
  const response = await fetch('https://api.x.ai/v1/chat/completions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'content-type': 'application/json' },
    body: JSON.stringify({
      model: process.env.GROK_MODEL || 'latest',
      temperature: 0,
      messages: [{ role: 'user', content: buildPolicyCompilerPrompt(naturalLanguage) }],
    }),
  });

  if (!response.ok) throw new Error(`Grok API error: ${await getErrorMessage(response)}`);

  const data = await response.json() as { choices?: Array<{ message?: { content?: string } }> };
  return parseCompiledPolicy(data.choices?.[0]?.message?.content ?? '', 'Grok');
}
