import { CompiledPolicy, PolicyConflict } from '../policy/policy.types';
import { validateCompiledPolicy, detectPolicyConflicts } from '../policy/policy.validator';
import { claudeCompilePolicy } from './claude-provider';
import { mockCompilePolicy } from './mock-provider';
import { z } from 'zod';

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
 * Falls back to mock provider if Claude API key is not available
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

  const apiKey = process.env.ANTHROPIC_API_KEY;
  const useMock = !apiKey || apiKey === 'test-key-not-set' || apiKey === 'your_anthropic_api_key_here';

  try {
    // Compile using Claude or mock
    let compiledPolicy: CompiledPolicy;

    if (!useMock && apiKey) {
      try {
        compiledPolicy = await claudeCompilePolicy(naturalLanguage, apiKey);
      } catch (error) {
        // Fall back to mock if Claude fails
        console.warn('Claude compilation failed, using mock provider:', error);
        compiledPolicy = await mockCompilePolicy(naturalLanguage);
      }
    } else {
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
        usedMock: useMock || !apiKey,
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
        usedMock: useMock || !apiKey,
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
      usedMock: useMock || !apiKey,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return {
      success: false,
      policy: null,
      error: `Failed to compile policy: ${message}`,
      conflicts: [],
      warnings: [],
      usedMock: useMock || !apiKey,
    };
  }
}
