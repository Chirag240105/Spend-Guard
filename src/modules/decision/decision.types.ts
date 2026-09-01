// Decision types and schemas

export type DecisionType = 'ALLOW' | 'HOLD' | 'BLOCK';
export type DecisionSource = 'DETERMINISTIC' | 'AI' | 'HUMAN_OVERRIDE';

export interface RuleEvaluation {
  rule: string;
  passed: boolean;
  message: string;
}

export interface Decision {
  id: string;
  transactionId: string;
  policyId: string;
  decision: DecisionType;
  reason: string;
  ruleResults: RuleEvaluation[];
  confidence?: number;
  source: DecisionSource;
  createdAt: Date;
}

export interface DecisionResult {
  decision: DecisionType;
  reasons: RuleEvaluation[];
  source: DecisionSource;
  explanation: string;
  confidence?: number;
}
