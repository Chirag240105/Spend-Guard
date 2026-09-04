import { getPrismaClient } from '@/src/infrastructure/database';
import {
  AgentDiagnosisSchema,
  MockDiagnosisProvider,
  humanReviewDiagnosis,
  type AIProvider,
} from '@/src/modules/agent/diagnosis';
import { decideRecovery } from '@/src/modules/recovery/policy';
import { enactRecovery } from '@/src/modules/recovery/recovery.service';
import { PaymentService } from '@/src/modules/payments/payment.service';
/** Worker entry point; AI receives only sanitized context and returns a recommendation, never a financial tool. */
export async function diagnoseFailedPayment(
  paymentId: string,
  provider: AIProvider = new MockDiagnosisProvider(),
) {
  const prisma = getPrismaClient();
  const payment = await prisma.payment.findUniqueOrThrow({
    where: { id: paymentId },
    include: { attempts: true },
  });
  await PaymentService.transition(paymentId, 'AI_DIAGNOSIS');
  const context = {
    paymentId,
    retryCount: payment.retryCount,
    gatewayErrorCode:
      payment.attempts
        .at(-1)
        ?.gatewayErrorCode?.replace(/[\r\n]/g, ' ')
        .slice(0, 300) ?? 'UNKNOWN',
  };
  let output;
  try {
    output = AgentDiagnosisSchema.parse(await provider.diagnose(context));
  } catch {
    output = humanReviewDiagnosis('Diagnosis unavailable or invalid; human review required.');
  }
  const action = decideRecovery(output, { retryCount: payment.retryCount });
  const decision = await prisma.agentDecision.create({
    data: { paymentId, inputSnapshot: context, output, policyAction: action },
  });
  return enactRecovery(paymentId, decision.id, action, output.retry_after_seconds);
}
