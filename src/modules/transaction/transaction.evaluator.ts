import { TransactionService } from '../transaction/transaction.service';
import { DecisionService } from '../decision/decision.service';
import { PolicyService } from '../policy/policy.service';
import { AuditService } from '../audit/audit.service';
import { evaluateTransaction } from '../decision/evaluator';
import {
  getSpendingContext,
  incrementDailySpend,
  incrementWeeklySpend,
  incrementMonthlySpend,
} from '../../infrastructure/redis';

import { OutboxService } from '../outbox/outbox.service';

export interface TransactionEvaluationRequest {
  policyId: string;
  amount: number;
  merchant: string;
  category: string;
  agentId: string;
  currency?: string;
  metadata?: Record<string, unknown>;
}

export interface TransactionEvaluationResponse {
  transactionId: string;
  decision: string;
  explanation: string;
  reasons: Array<{
    rule: string;
    passed: boolean;
    message: string;
  }>;
  ruleResults: Array<{
    rule: string;
    passed: boolean;
    message: string;
  }>;
  source: string;
  spendingContext: {
    dailySpent: number;
    weeklySpent: number;
    monthlySpent: number;
  };
  requiresApproval?: boolean;
}

/**
 * Complete transaction evaluation service
 * Orchestrates policy lookup, decision evaluation, and persistence
 */
export class TransactionEvaluator {
  /**
   * Evaluate a transaction against a policy
   */
  static async evaluateTransaction(
    request: TransactionEvaluationRequest
  ): Promise<TransactionEvaluationResponse> {
    const now = new Date();

    try {
      // 1. Load policy
      const policy = await PolicyService.getPolicyById(request.policyId);
      if (!policy) {
        throw new Error(`Policy ${request.policyId} not found`);
      }

      // 2. Create transaction record
      const transaction = await TransactionService.createTransaction(
        request.policyId,
        {
          amount: request.amount,
          merchant: request.merchant,
          category: request.category,
          agentId: request.agentId,
          currency: request.currency || 'INR',
          metadata: request.metadata,
        }
      );

      // Log transaction received
      await AuditService.logEvent(
        'TRANSACTION_RECEIVED',
        'SYSTEM',
        {
          amount: request.amount,
          merchant: request.merchant,
          category: request.category,
        },
        transaction.id,
        request.policyId
      );

      // 3. Get spending context
      let spendingContext;
      try {
        spendingContext = await getSpendingContext(request.agentId, now);
      } catch (error) {
        // If Redis fails, HOLD the transaction
        await AuditService.logEvent(
          'SPENDING_CONTEXT_ERROR',
          'SYSTEM',
          { error: String(error) },
          transaction.id,
          request.policyId
        );

        const decision = await DecisionService.recordDecision(
          transaction.id,
          request.policyId,
          'HOLD',
          'Spending limit could not be verified.',
          [
            {
              rule: 'Spending context verification',
              passed: false,
              message: 'Could not retrieve spending context from Redis',
            },
          ],
          'DETERMINISTIC'
        );

        return {
          transactionId: transaction.id,
          decision: decision.decision,
          explanation: decision.reason,
          reasons: decision.ruleResults,
          ruleResults: decision.ruleResults,
          source: decision.source,
          spendingContext: {
            dailySpent: 0,
            weeklySpent: 0,
            monthlySpent: 0,
          },
          requiresApproval: false,
        };
      }

      // 4. Evaluate transaction against policy
      const evaluationResult = evaluateTransaction(
        transaction,
        policy.compiledPolicy,
        spendingContext
      );

      // 5. Record decision
      const decision = await DecisionService.recordDecision(
        transaction.id,
        request.policyId,
        evaluationResult.decision,
        evaluationResult.explanation,
        evaluationResult.reasons,
        evaluationResult.source,
        evaluationResult.confidence
      );
      

if (evaluationResult.decision === 'BLOCK') {
  await OutboxService.enqueue({
    eventType: 'payment.failed',
    aggregateId: transaction.id,
    payload: {
      transactionId: transaction.id,
      policyId: request.policyId,
      amount: request.amount,
      merchant: request.merchant,
      reason: evaluationResult.explanation,
      decisionSource: evaluationResult.source,
      timestamp: new Date().toISOString(),
    },
  });
}
      // Log decision
      await AuditService.logEvent(
        'DECISION_MADE',
        'SYSTEM',
        {
          decision: evaluationResult.decision,
          source: evaluationResult.source,
        },
        transaction.id,
        request.policyId
      );

      // HOLD transactions are not counted until a reviewer approves them. This avoids
      // reserving spend indefinitely and ensures a rejected HOLD is never counted.
      if (evaluationResult.decision === 'ALLOW') {
        try {
          await Promise.all([
            incrementDailySpend(request.agentId, request.amount, now),
            incrementWeeklySpend(request.agentId, request.amount, now),
            incrementMonthlySpend(request.agentId, request.amount, now),
          ]);

          // Get updated spending context
          const updatedContext = await getSpendingContext(request.agentId, now);

          return {
            transactionId: transaction.id,
            decision: decision.decision,
            explanation: decision.reason,
            reasons: decision.ruleResults,
            ruleResults: decision.ruleResults,
            source: decision.source,
            spendingContext: {
              dailySpent: updatedContext.dailySpent,
              weeklySpent: updatedContext.weeklySpent,
              monthlySpent: updatedContext.monthlySpent,
            },
            requiresApproval: decision.decision === 'HOLD',
          };
        } catch (error) {
          console.warn('Failed to update spending counters:', error);
          // Return response without updated counters
          return {
            transactionId: transaction.id,
            decision: decision.decision,
            explanation: decision.reason,
            reasons: decision.ruleResults,
            ruleResults: decision.ruleResults,
            source: decision.source,
            spendingContext,
            requiresApproval: decision.decision === 'HOLD',
          };
        }
      }

      return {
        transactionId: transaction.id,
        decision: decision.decision,
        explanation: decision.reason,
        reasons: decision.ruleResults,
        ruleResults: decision.ruleResults,
        source: decision.source,
        spendingContext,
        requiresApproval: decision.decision === 'HOLD',
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Transaction evaluation failed: ${message}`);
    }
  }

  /**
   * Approve a HOLD transaction (human override)
   */
  static async approveTransaction(
    transactionId: string,
    policyId: string
  ): Promise<void> {
    const transaction = await TransactionService.getTransactionById(transactionId);
    if (!transaction || transaction.policyId !== policyId) throw new Error('Transaction not found for this policy');
    await DecisionService.resolveDecision(transactionId, 'ALLOW');
    await Promise.all([
      incrementDailySpend(transaction.agentId, transaction.amount, transaction.timestamp),
      incrementWeeklySpend(transaction.agentId, transaction.amount, transaction.timestamp),
      incrementMonthlySpend(transaction.agentId, transaction.amount, transaction.timestamp),
    ]);
    await AuditService.logEvent(
      'HUMAN_OVERRIDE',
      'USER',
      {
        originalDecision: 'HOLD',
        newDecision: 'ALLOW',
      },
      transactionId,
      policyId
    );
  }

  /**
   * Block a HOLD transaction
   */
  static async rejectTransaction(
    transactionId: string,
    policyId: string
  ): Promise<void> {
    const transaction = await TransactionService.getTransactionById(transactionId);
    if (!transaction || transaction.policyId !== policyId) throw new Error('Transaction not found for this policy');
    await DecisionService.resolveDecision(transactionId, 'BLOCK');
    await AuditService.logEvent(
      'HUMAN_OVERRIDE',
      'USER',
      {
        originalDecision: 'HOLD',
        newDecision: 'BLOCK',
      },
      transactionId,
      policyId
    );
  }
}
