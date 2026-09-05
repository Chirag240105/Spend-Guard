export function buildPolicyCompilerPrompt(naturalLanguage: string): string {
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
  "limits": { "perTransaction": 500 or null, "daily": 2000 or null, "weekly": null, "monthly": null },
  "categories": { "allowed": ["category1", "category2"] or [], "blocked": ["blocked1"] or [] },
  "merchants": { "allowed": [], "blocked": [] },
  "timeWindow": { "start": "HH:MM", "end": "HH:MM", "timezone": "UTC" } or null,
  "approval": { "aboveAmount": 500, "categories": [] } or null
}

CRITICAL RULES:
- Never invent rules not explicitly stated
- All monetary amounts must be numbers (no currency symbols)
- Time must be in HH:MM format (24-hour)
- Categories must be lowercase with underscores
- If an optional object is not mentioned, set the object to null. Within an object, omit optional scalar fields and always use empty arrays for list fields.
- Return ONLY the JSON object, no additional text`;
}
