import { NextRequest, NextResponse } from 'next/server';
import { TransactionEvaluator } from '@/src/modules/transaction/transaction.evaluator';
import { TransactionService } from '@/src/modules/transaction/transaction.service';
import { logRoute, requireApiKey } from '@/src/infrastructure/api';

export async function POST(request: NextRequest, { params }: { params: Promise<{ transactionId: string }> }) {
  const denied = requireApiKey(request); if (denied) return denied;
  try {
    const { transactionId } = await params; const transaction = await TransactionService.getTransactionById(transactionId);
    if (!transaction) return NextResponse.json({ error: 'Transaction not found' }, { status: 404 });
    await TransactionEvaluator.rejectTransaction(transactionId, transaction.policyId);
    logRoute('transaction_rejected', { transactionId });
    return NextResponse.json({ success: true, decision: 'BLOCK' });
  } catch (error) { const message = error instanceof Error ? error.message : 'Failed to reject transaction'; return NextResponse.json({ error: message }, { status: 400 }); }
}
