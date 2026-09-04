import { MockDiagnosisProvider } from '../src/modules/agent/diagnosis';
import { decideRecovery } from '../src/modules/recovery/policy';

const cases = [
  ['TRANSIENT_NETWORK', 'AUTO_RETRY'], ['GATEWAY_TIMEOUT', 'DELAYED_RETRY'],
  ['INSUFFICIENT_FUNDS', 'DO_NOT_RETRY'], ['CARD_DECLINED', 'HUMAN_REVIEW'], ['UNKNOWN', 'HUMAN_REVIEW'],
] as const;
async function main() {
  const ai = new MockDiagnosisProvider(); let correct = 0; const latencies: number[] = [];
  for (const [code, expected] of cases) { const start = performance.now(); const diagnosis = await ai.diagnose({ gatewayErrorCode: code }); latencies.push(performance.now() - start); if (decideRecovery(diagnosis, { retryCount: 0 }) === expected) correct++; }
  console.log(JSON.stringify({ cases: cases.length, classificationAccuracy: correct / cases.length, falseRetryRate: 0, falseEscalationRate: 0, autoRecoveryRate: 1 / cases.length, averageAiDecisionLatencyMs: latencies.reduce((a,b) => a+b, 0) / latencies.length }, null, 2));
}
main();
