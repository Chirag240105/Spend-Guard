import { NextRequest, NextResponse } from 'next/server';
import { DecisionService } from '@/src/modules/decision/decision.service';
import { TransactionService } from '@/src/modules/transaction/transaction.service';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ transactionId: string }> },
) {
  try {
    const { transactionId } = await params;
    const decision = await DecisionService.getDecisionByTransactionId(transactionId);

    if (!decision) {
      return NextResponse.json({ error: 'Decision not found' }, { status: 404 });
    }

    const transaction = await TransactionService.getTransactionById(transactionId);
    return NextResponse.json({
      success: true,
      decision,
      transaction,
    });
  } catch (error) {
    console.error('Error fetching decision:', error);
    return NextResponse.json({ error: 'Failed to fetch decision' }, { status: 500 });
  }
}
