import { getPrismaClient } from '../infrastructure/database';

export interface AuditEvent {
  id: string;
  transactionId?: string;
  policyId?: string;
  event: string;
  actor: string;
  details?: Record<string, unknown>;
  createdAt: Date;
}

/**
 * Audit Service - logs all significant events
 */
export class AuditService {
  /**
   * Log an audit event
   */
  static async logEvent(
    event: string,
    actor: string,
    details?: Record<string, unknown>,
    transactionId?: string,
    policyId?: string
  ): Promise<AuditEvent> {
    const prisma = getPrismaClient();

    const auditLog = await prisma.auditLog.create({
      data: {
        event,
        actor,
        details,
        transactionId,
        policyId,
      },
    });

    return {
      id: auditLog.id,
      transactionId: auditLog.transactionId || undefined,
      policyId: auditLog.policyId || undefined,
      event: auditLog.event,
      actor: auditLog.actor,
      details: (auditLog.details as Record<string, unknown>) || undefined,
      createdAt: auditLog.createdAt,
    };
  }

  /**
   * Get audit log for a transaction
   */
  static async getTransactionAuditLog(transactionId: string): Promise<AuditEvent[]> {
    const prisma = getPrismaClient();
    const logs = await prisma.auditLog.findMany({
      where: { transactionId },
      orderBy: { createdAt: 'asc' },
    });

    return logs.map((l) => ({
      id: l.id,
      transactionId: l.transactionId || undefined,
      policyId: l.policyId || undefined,
      event: l.event,
      actor: l.actor,
      details: (l.details as Record<string, unknown>) || undefined,
      createdAt: l.createdAt,
    }));
  }

  /**
   * Get audit log for a policy
   */
  static async getPolicyAuditLog(policyId: string, limit: number = 100): Promise<AuditEvent[]> {
    const prisma = getPrismaClient();
    const logs = await prisma.auditLog.findMany({
      where: { policyId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    return logs.map((l) => ({
      id: l.id,
      transactionId: l.transactionId || undefined,
      policyId: l.policyId || undefined,
      event: l.event,
      actor: l.actor,
      details: (l.details as Record<string, unknown>) || undefined,
      createdAt: l.createdAt,
    }));
  }
}
