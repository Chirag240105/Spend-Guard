import { NextRequest, NextResponse } from 'next/server';
import { PolicyService } from '@/src/modules/policy/policy.service';
import { CompiledPolicySchema } from '@/src/modules/policy/policy.types';
import { logRoute, requireApiKey } from '@/src/infrastructure/api';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ policyId: string }> },
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
    return NextResponse.json({ error: 'Failed to fetch policy' }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ policyId: string }> },
) {
  try {
    const denied = requireApiKey(request);
    if (denied) return denied;
    const { policyId } = await params;
    const body = await request.json();
    const parsed = CompiledPolicySchema.safeParse(body.compiledPolicy);
    if (!parsed.success)
      return NextResponse.json({ error: 'A valid compiledPolicy is required' }, { status: 400 });
    const policy = await PolicyService.updatePolicy(policyId, parsed.data);
    logRoute('policy_updated', { policyId });
    return NextResponse.json({ success: true, policy });
  } catch (error) {
    console.error('Error updating policy:', error);
    return NextResponse.json({ error: 'Failed to update policy' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ policyId: string }> },
) {
  try {
    const denied = requireApiKey(request);
    if (denied) return denied;
    const { policyId } = await params;
    await PolicyService.deactivatePolicy(policyId);
    logRoute('policy_deactivated', { policyId });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deactivating policy:', error);
    return NextResponse.json({ error: 'Failed to deactivate policy' }, { status: 500 });
  }
}
