export const paymentTransitions = {
  CREATED: ['ATTEMPTED'],
  ATTEMPTED: ['SUCCESS', 'FAILED'],
  FAILED: ['AI_DIAGNOSIS'],
  AI_DIAGNOSIS: ['RECOVERY_PENDING', 'HUMAN_REVIEW', 'DO_NOT_RETRY'],
  RECOVERY_PENDING: ['RETRYING', 'DO_NOT_RETRY'],
  RETRYING: ['SUCCESS', 'FAILED', 'DO_NOT_RETRY', 'RECOVERY_PENDING'],
  HUMAN_REVIEW: ['APPROVED', 'REJECTED'],
  APPROVED: ['RETRYING'],
  REJECTED: ['DO_NOT_RETRY'],
  SUCCESS: [],
  DO_NOT_RETRY: [],
} as const;
export type PaymentState = keyof typeof paymentTransitions;
export function assertPaymentTransition(from: PaymentState, to: PaymentState) {
  if (!(paymentTransitions[from] as readonly string[]).includes(to))
    throw new Error(`Invalid payment transition: ${from} -> ${to}`);
}
