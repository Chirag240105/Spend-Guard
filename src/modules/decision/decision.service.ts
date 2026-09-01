import { getPrismaClient } from '../infrastructure/database';
import { Decision, DecisionType, DecisionSource } from './decision.types';
import { RuleEvaluation } from './decision.types';

/**
 * Decision Service - manages decision recording
 */
export class DecisionService {
  /**
   * Record a decision
   */
  static async recordDecision(
    transactionId: string,
    policyId: string,
    decision: DecisionType,
    reason: string,
    ruleResults: RuleEvaluation[],
    source: DecisionSource,
    confidence?: number
  ): Promise<Decision> {
    const prisma = getPrismaClient();

    const result = await prisma.decision.create({
      data: {
        transactionId,
        policyId,
        decision,
        reason,
        ruleResults,
        source,
        confidence,
      },
    });

    return this.mapDatabaseDecisionToDomain(result);
  }

  /**
   * Get a decision by transaction ID
   */
  static async getDecisionByTransactionId(transactionId: string): Promise<Decision | null> {
    const prisma = getPrismaClient();
    const decision = await prisma.decision.findUnique({
      where: { transactionId },
    });

    return decision ? this.mapDatabaseDecisionToDomain(decision) : null;
  }

  /**
   * Get all decisions for a policy
   */
  static async getDecisionsByPolicyId(
    policyId: string,
    limit: number = 50
  ): Promise<Decision[]> {
    const prisma = getPrismaClient();
    const decisions = await prisma.decision.findMany({
      where: { policyId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    return decisions.map((d) => this.mapDatabaseDecisionToDomain(d));
  }

  /**
   * Get decision statistics for a policy
   */
  static async getDecisionStats(policyId: string) {
    const prisma = getPrismaClient();
    const stats = await prisma.decision.groupBy({
      by: ['decision'],
      where: { policyId },
      _count: true,
    });

    return stats.reduce(
      (acc, stat) => {
        acc[stat.decision as DecisionType] = stat._count;
        return acc;
      },
      { ALLOW: 0, HOLD: 0, BLOCK: 0 } as Record<DecisionType, number>
    );
  }

  private static mapDatabaseDecisionToDomain(decision: any): Decision {
    return {
      id: decision.id,
      transactionId: decision.transactionId,
      policyId: decision.policyId,
      decision: decision.decision as DecisionType,
      reason: decision.reason,
      ruleResults: decision.ruleResults as RuleEvaluation[],
      confidence: decision.confidence || undefined,
      source: decision.source as DecisionSource,
      createdAt: decision.createdAt,
    };
  }
}
