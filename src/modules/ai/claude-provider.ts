import { CompiledPolicy } from '../policy/policy.types';

/**
 * Real Claude API provider
 */
export async function claudeCompilePolicy(
  naturalLanguage: string,
  apiKey: string,
): Promise<CompiledPolicy> {
  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 1024,
        messages: [
          {
            role: 'user',
            content: buildCompilerPrompt(naturalLanguage),
          },
        ],
      }),
    });

    if (!response.ok) {
      throw new Error(`Claude API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    const responseText = data.content[0].type === 'text' ? data.content[0].text : '';

    // Extract JSON from response
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Claude did not return valid JSON');
    }

    const policy = JSON.parse(jsonMatch[0]) as CompiledPolicy;
    return policy;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to compile policy with Claude: ${message}`);
  }
}

function buildCompilerPrompt(naturalLanguage: string): string {
  return `You are a financial policy compiler. Convert the following natural language policy into a strict JSON structure.

Natural Language Policy:
"""
${naturalLanguage}
"""

INSTRUCTIONS:
1. Extract explicit numerical limits ONLY - never invent limits
2. Extract category restrictions ONLY if explicitly mentioned
3. Extract merchant restrictions ONLY if explicitly mentioned
4. Extract time windows ONLY if explicitly mentioned
5. Extract approval thresholds ONLY if explicitly mentioned
6. Use snake_case for category names (e.g., "school_supplies", "gaming")
7. Return ONLY valid JSON - no explanations

Output this JSON structure EXACTLY:
{
  "name": "Policy name from context",
  "limits": {
    "perTransaction": 500 or null,
    "daily": 2000 or null,
    "weekly": null,
    "monthly": null
  },
  "categories": {
    "allowed": ["category1", "category2"] or [],
    "blocked": ["blocked1"] or []
  },
  "merchants": {
    "allowed": [] or null,
    "blocked": [] or null
  },
  "timeWindow": {
    "start": "HH:MM",
    "end": "HH:MM",
    "timezone": "UTC"
  } or null,
  "approval": {
    "aboveAmount": 500 or null,
    "categories": [] or null
  } or null
}

CRITICAL RULES:
- Never invent rules not explicitly stated
- All monetary amounts must be numbers (no currency symbols)
- Time must be in HH:MM format (24-hour)
- Categories must be lowercase with underscores
- If a field is not mentioned, set to null or empty array
- Return ONLY the JSON object, no additional text`;
}
