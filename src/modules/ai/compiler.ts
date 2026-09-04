import { CompiledPolicy } from '../policy/policy.types';
import { validateCompiledPolicy, detectPolicyConflicts } from '../policy/policy.validator';
import { geminiCompilePolicy } from './gemini-provider';
import { grokCompilePolicy } from './grok-provider';
import { mockCompilePolicy } from './mock-provider';

export interface PolicyCompilationResult {
  success: boolean;
  policy: CompiledPolicy | null;
  error: string | null;
  conflicts: string[];
  warnings: string[];
  usedMock: boolean;
}

/**
 * Compiles a natural language policy into a structured, validated policy
 * Uses Grok as the primary provider, Gemini as the backup, and mock compilation last.
 */
export async function compilePolicy(
  naturalLanguage: string
): Promise<PolicyCompilationResult> {
  // Validate input
  if (!naturalLanguage || naturalLanguage.trim().length === 0) {
    return {
      success: false,
      policy: null,
      error: 'Policy text cannot be empty',
      conflicts: [],
      warnings: [],
      usedMock: false,
    };
  }

  const grokApiKey = process.env.XAI_API_KEY;
  const geminiApiKey = process.env.GEMINI_API_KEY;
  let usedMock = false;

  try {
    let compiledPolicy: CompiledPolicy;

    if (grokApiKey) {
      try {
        compiledPolicy = await grokCompilePolicy(naturalLanguage, grokApiKey);
      } catch (error) {
        console.warn('Grok compilation failed; trying Gemini:', error);
        if (geminiApiKey) {
          try {
            compiledPolicy = await geminiCompilePolicy(naturalLanguage, geminiApiKey);
          } catch (geminiError) {
            console.warn('Gemini compilation failed; using mock provider:', geminiError);
            usedMock = true;
            compiledPolicy = await mockCompilePolicy(naturalLanguage);
          }
        } else {
          usedMock = true;
          compiledPolicy = await mockCompilePolicy(naturalLanguage);
        }
      }
    } else if (geminiApiKey) {
      try {
        compiledPolicy = await geminiCompilePolicy(naturalLanguage, geminiApiKey);
      } catch (error) {
        console.warn('Gemini compilation failed; using mock provider:', error);
        usedMock = true;
        compiledPolicy = await mockCompilePolicy(naturalLanguage);
      }
    } else {
      usedMock = true;
      compiledPolicy = await mockCompilePolicy(naturalLanguage);
    }

    // Validate the compiled policy
    const validation = validateCompiledPolicy(compiledPolicy);
    if (!validation.valid) {
      return {
        success: false,
        policy: null,
        error: validation.error,
        conflicts: [],
        warnings: [],
        usedMock,
      };
    }

    // Check for policy conflicts
    const conflicts = detectPolicyConflicts(compiledPolicy);
    const warnings: string[] = [];

    if (conflicts.detected) {
      return {
        success: false,
        policy: null,
        error: conflicts.message,
        conflicts: conflicts.conflicts,
        warnings,
        usedMock,
      };
    }

    // Add warnings for potential issues
    if (!compiledPolicy.limits.perTransaction && !compiledPolicy.limits.daily) {
      warnings.push('No per-transaction or daily limit defined. Transactions could be unbounded.');
    }

    if (
      compiledPolicy.categories.allowed &&
      compiledPolicy.categories.allowed.length === 0 &&
      compiledPolicy.categories.blocked &&
      compiledPolicy.categories.blocked.length === 0
    ) {
      warnings.push('No category restrictions defined. All categories will be allowed.');
    }

    return {
      success: true,
      policy: compiledPolicy,
      error: null,
      conflicts: [],
      warnings,
      usedMock,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return {
      success: false,
      policy: null,
      error: `Failed to compile policy: ${message}`,
      conflicts: [],
      warnings: [],
      usedMock,
    };
  }
}
