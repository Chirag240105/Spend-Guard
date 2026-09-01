import { NextRequest, NextResponse } from 'next/server';
import { compilePolicy } from '@/src/modules/ai/compiler';
import { PolicyService } from '@/src/modules/policy/policy.service';
import { AuditService } from '@/src/modules/audit/audit.service';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { naturalLanguage } = body;

    if (!naturalLanguage || typeof naturalLanguage !== 'string') {
      return NextResponse.json(
        { error: 'naturalLanguage is required and must be a string' },
        { status: 400 }
      );
    }

    // Compile the policy
    const compilationResult = await compilePolicy(naturalLanguage);

    if (!compilationResult.success) {
      return NextResponse.json(
        {
          error: compilationResult.error,
          conflicts: compilationResult.conflicts,
          usedMock: compilationResult.usedMock,
        },
        { status: 400 }
      );
    }

    // Save the policy
    const policy = await PolicyService.createPolicy(
      `Policy from AI Compiler - ${new Date().toISOString()}`,
      naturalLanguage,
      compilationResult.policy!
    );

    // Log policy creation
    await AuditService.logEvent(
      'POLICY_CREATED',
      'AI_COMPILER',
      {
        naturalLanguage,
        usedMock: compilationResult.usedMock,
      },
      undefined,
      policy.id
    );

    return NextResponse.json(
      {
        success: true,
        policy: {
          id: policy.id,
          name: policy.name,
          naturalLanguage: policy.naturalLanguage,
          compiledPolicy: policy.compiledPolicy,
          version: policy.version,
          active: policy.active,
          createdAt: policy.createdAt,
        },
        warnings: compilationResult.warnings,
        usedMock: compilationResult.usedMock,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Policy compilation error:', error);
    return NextResponse.json(
      { error: 'Failed to compile policy' },
      { status: 500 }
    );
  }
}
