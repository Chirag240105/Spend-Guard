import { getPrismaClient } from '@/src/infrastructure/database'; import { PaymentService } from '../payments/payment.service'; import type { RecoveryAction } from './policy';
export async function enactRecovery(paymentId: string, decisionId: string, action: RecoveryAction, delaySeconds = 0) {
 const prisma = getPrismaClient();
 if (action === 'HUMAN_REVIEW') { await PaymentService.transition(paymentId, 'HUMAN_REVIEW'); return prisma.humanApproval.create({ data: { agentDecisionId: decisionId } }); }
 if (action === 'DO_NOT_RETRY') { await PaymentService.transition(paymentId, 'HUMAN_REVIEW'); await PaymentService.transition(paymentId, 'REJECTED'); return PaymentService.transition(paymentId, 'DO_NOT_RETRY'); }
 await PaymentService.transition(paymentId, 'RECOVERY_PENDING');
 await prisma.outboxEvent.create({ data: { aggregateType: 'payment', aggregateId: paymentId, eventType: 'payment.retry', payload: { paymentId, delaySeconds } } });
 return { queued: true };
}
export async function resolveApproval(id: string, approved: boolean, reviewer = 'reviewer') {
 const prisma = getPrismaClient(); const approval = await prisma.humanApproval.findUniqueOrThrow({ where: { id }, include: { agentDecision: true } });
 if (approval.status !== 'pending') throw new Error('Approval has already been resolved');
 const paymentId = approval.agentDecision.paymentId; await prisma.humanApproval.update({ where: { id }, data: { status: approved ? 'approved' : 'rejected', reviewedBy: reviewer, reviewedAt: new Date() } });
 await PaymentService.transition(paymentId, approved ? 'APPROVED' : 'REJECTED');
 if (!approved) return PaymentService.transition(paymentId, 'DO_NOT_RETRY');
 return PaymentService.attempt(paymentId);
}
