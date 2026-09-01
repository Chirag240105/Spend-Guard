import { NextRequest, NextResponse } from 'next/server';
import { TransactionEvaluator } from '@/src/modules/transaction/transaction.evaluator';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      policyId,
      amount,
      merchant,
      category,
      agentId,
      currency,
      metadata,
    } = body;

    // Validate required fields
    if (!policyId || !amount || !merchant || !category || !agentId) {
      return NextResponse.json(
        {
          error: 'Missing required fields: policyId, amount, merchant, category, agentId',
        },
        { status: 400 }
      );
    }

    // Validate amount
    if (typeof amount !== 'number' || amount <= 0) {
      return NextResponse.json(
        { error: 'amount must be a positive number' },
        { status: 400 }
      );
    }

    // Evaluate transaction
    const result = await TransactionEvaluator.evaluateTransaction({
      policyId,
      amount,
      merchant,
      category,
      agentId,
      currency: currency || 'INR',
      metadata: metadata || {},
    });

    return NextResponse.json(
      {
        success: true,
        transaction: result,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Transaction evaluation error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: `Failed to evaluate transaction: ${message}` },
      { status: 500 }
    );
  }
}
