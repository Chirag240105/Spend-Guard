import { Decision as PrismaDecision, Prisma } from '@prisma/client';
import { getPrismaClient } from '../../infrastructure/database';
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
    confidence?: number,
  ): Promise<Decision> {
    const prisma = getPrismaClient();

    const result = await prisma.decision.create({
      data: {
        transactionId,
        policyId,
        decision,
        reason,
        ruleResults: ruleResults as unknown as Prisma.InputJsonValue,
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
  static async getDecisionsByPolicyId(policyId: string, limit: number = 50): Promise<Decision[]> {
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
      { ALLOW: 0, HOLD: 0, BLOCK: 0 } as Record<DecisionType, number>,
    );
  }

  static async resolveDecision(
    transactionId: string,
    outcome: 'ALLOW' | 'BLOCK',
  ): Promise<Decision> {
    const prisma = getPrismaClient();
    const existing = await prisma.decision.findUnique({ where: { transactionId } });
    if (!existing) throw new Error('Decision not found');
    if (existing.decision !== 'HOLD')
      throw new Error(
        `Only HOLD decisions can be resolved. Current decision: ${existing.decision}`,
      );
    const result = await prisma.decision.update({
      where: { transactionId },
      data: {
        decision: outcome,
        source: 'HUMAN_OVERRIDE',
        reason: `Human reviewer ${outcome === 'ALLOW' ? 'approved' : 'rejected'} this transaction.`,
      },
    });
    return this.mapDatabaseDecisionToDomain(result);
  }

  static async listDecisions(
    options: { skip?: number; take?: number; decision?: DecisionType } = {},
  ) {
    const prisma = getPrismaClient();
    const where = options.decision ? { decision: options.decision } : undefined;
    const [items, total] = await Promise.all([
      prisma.decision.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: options.skip,
        take: options.take,
        include: { transaction: true, policy: true },
      }),
      prisma.decision.count({ where }),
    ]);
    return {
      items: items.map((item) => ({
        decision: this.mapDatabaseDecisionToDomain(item),
        transaction: item.transaction,
        policy: item.policy,
      })),
      total,
    };
  }

  private static mapDatabaseDecisionToDomain(decision: PrismaDecision): Decision {
    return {
      id: decision.id,
      transactionId: decision.transactionId,
      policyId: decision.policyId,
      decision: decision.decision as DecisionType,
      reason: decision.reason,
      ruleResults: decision.ruleResults as unknown as RuleEvaluation[],
      confidence: decision.confidence || undefined,
      source: decision.source as DecisionSource,
      createdAt: decision.createdAt,
    };
  }
}
