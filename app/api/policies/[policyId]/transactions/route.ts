import { NextRequest, NextResponse } from 'next/server';
import { TransactionService } from '@/src/modules/transaction/transaction.service';
import { DecisionService } from '@/src/modules/decision/decision.service';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ policyId: string }> }
) {
  try {
    const { policyId } = await params;
    const transactions = await TransactionService.getTransactionsByPolicyId(
      policyId,
      50
    );

    const transactionsWithDecisions = await Promise.all(
      transactions.map(async (tx) => {
        const decision = await DecisionService.getDecisionByTransactionId(
          tx.id
        );
        return {
          ...tx,
          decision: decision || null,
        };
      })
    );

    return NextResponse.json({
      success: true,
      transactions: transactionsWithDecisions,
    });
  } catch (error) {
    console.error('Error fetching transactions:', error);
    return NextResponse.json(
      { error: 'Failed to fetch transactions' },
      { status: 500 }
    );
  }
}
