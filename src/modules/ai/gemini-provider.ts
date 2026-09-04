import { CompiledPolicy } from '../policy/policy.types';
import { buildPolicyCompilerPrompt } from './policy-prompt';
import { getErrorMessage, parseCompiledPolicy } from './provider-utils';

/** Google Gemini policy compiler (fallback provider). */
export async function geminiCompilePolicy(naturalLanguage: string, apiKey: string): Promise<CompiledPolicy> {
  const response = await fetch('https://generativelanguage.googleapis.com/v1beta/interactions', {
    method: 'POST',
    headers: { 'x-goog-api-key': apiKey, 'content-type': 'application/json' },
    body: JSON.stringify({
      model: process.env.GEMINI_MODEL || 'gemini-3.8-flash',
      input: buildPolicyCompilerPrompt(naturalLanguage),
      generation_config: { temperature: 0 },
      store: false,
    }),
  });

  if (!response.ok) throw new Error(`Gemini API error: ${await getErrorMessage(response)}`);

  const data = await response.json() as { output_text?: string };
  return parseCompiledPolicy(data.output_text ?? '', 'Gemini');
}
