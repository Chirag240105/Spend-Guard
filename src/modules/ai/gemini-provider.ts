import { CompiledPolicy } from '../policy/policy.types';
import { buildPolicyCompilerPrompt } from './policy-prompt';
import { getErrorMessage, parseCompiledPolicy } from './provider-utils';

/** Google Gemini policy compiler (fallback provider). */
export async function geminiCompilePolicy(
  naturalLanguage: string,
  apiKey: string,
): Promise<CompiledPolicy> {
  const model = process.env.GEMINI_MODEL || 'gemini-1.5-flash-latest';
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      contents: [
        {
          parts: [{ text: buildPolicyCompilerPrompt(naturalLanguage) }],
        },
      ],
      generationConfig: { temperature: 0 },
    }),
  });

  if (!response.ok) {
    throw new Error(`Gemini API error: ${await getErrorMessage(response)}`);
  }

  const data = (await response.json()) as {
    candidates?: Array<{
      content?: { parts?: Array<{ text?: string }> };
    }>;
  };
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
  if (!text) throw new Error('Gemini returned empty content');
  return parseCompiledPolicy(text, 'Gemini');
}
