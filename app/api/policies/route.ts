import { NextRequest, NextResponse } from 'next/server';
import { PolicyService } from '@/src/modules/policy/policy.service';
import { CompiledPolicySchema } from '@/src/modules/policy/policy.types';
import { logRoute, pagination, requireApiKey } from '@/src/infrastructure/api';

export async function GET(request: NextRequest) {
  try {
    const denied = requireApiKey(request); if (denied) return denied;
    const { page, limit, skip } = pagination(request.nextUrl.searchParams);
    const activeParam = request.nextUrl.searchParams.get('active');
    const { items: policies, total } = await PolicyService.listPolicies({ skip, take: limit, active: activeParam === null ? undefined : activeParam === 'true' });

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
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error('Error listing policies:', error);
    return NextResponse.json(
      { error: 'Failed to list policies' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const denied = requireApiKey(request); if (denied) return denied;
    const body = await request.json();
    const parsed = CompiledPolicySchema.safeParse(body.compiledPolicy);
    if (!parsed.success || typeof body.naturalLanguage !== 'string') return NextResponse.json({ error: 'name, naturalLanguage and a valid compiledPolicy are required' }, { status: 400 });
    const policy = await PolicyService.createPolicy(typeof body.name === 'string' ? body.name : parsed.data.name, body.naturalLanguage, parsed.data);
    logRoute('policy_created', { policyId: policy.id });
    return NextResponse.json({ success: true, policy }, { status: 201 });
  } catch (error) { console.error('Error creating policy:', error); return NextResponse.json({ error: 'Failed to create policy' }, { status: 500 }); }
}
