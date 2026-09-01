import { NextRequest, NextResponse } from 'next/server';
import { DecisionService } from '@/src/modules/decision/decision.service';
import { AuditService } from '@/src/modules/audit/audit.service';
import { TransactionService } from '@/src/modules/transaction/transaction.service';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ policyId: string }> }
) {
  try {
    const { policyId } = await params;
    const auditLogs = await AuditService.getPolicyAuditLog(policyId, 100);

    return NextResponse.json({
      success: true,
      auditLogs,
    });
  } catch (error) {
    console.error('Error fetching audit logs:', error);
    return NextResponse.json(
      { error: 'Failed to fetch audit logs' },
      { status: 500 }
    );
  }
}
