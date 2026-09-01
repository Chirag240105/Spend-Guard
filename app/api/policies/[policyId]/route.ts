import { NextRequest, NextResponse } from 'next/server';
import { PolicyService } from '@/src/modules/policy/policy.service';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ policyId: string }> }
) {
  try {
    const { policyId } = await params;
    const policy = await PolicyService.getPolicyById(policyId);

    if (!policy) {
      return NextResponse.json({ error: 'Policy not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      policy: {
        id: policy.id,
        name: policy.name,
        naturalLanguage: policy.naturalLanguage,
        compiledPolicy: policy.compiledPolicy,
        version: policy.version,
        active: policy.active,
        createdAt: policy.createdAt,
        updatedAt: policy.updatedAt,
      },
    });
  } catch (error) {
    console.error('Error fetching policy:', error);
    return NextResponse.json(
      { error: 'Failed to fetch policy' },
      { status: 500 }
    );
  }
}
