import { NextRequest, NextResponse } from 'next/server';
import { PolicyService } from '@/src/modules/policy/policy.service';

export async function GET(_request: NextRequest) {
  try {
    const policies = await PolicyService.listActivePolicies();

    return NextResponse.json({
      success: true,
      policies: policies.map((p) => ({
        id: p.id,
        name: p.name,
        naturalLanguage: p.naturalLanguage,
        compiledPolicy: p.compiledPolicy,
        version: p.version,
        active: p.active,
        createdAt: p.createdAt,
        updatedAt: p.updatedAt,
      })),
    });
  } catch (error) {
    console.error('Error listing policies:', error);
    return NextResponse.json(
      { error: 'Failed to list policies' },
      { status: 500 }
    );
  }
}
