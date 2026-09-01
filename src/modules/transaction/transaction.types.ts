// Transaction types and schemas

export interface Transaction {
  id: string;
  amount: number;
  currency: string;
  merchant: string;
  category: string;
  timestamp: Date;
  agentId: string;
  metadata?: Record<string, unknown>;
  policyId: string;
  createdAt: Date;
}

export interface TransactionInput {
  amount: number;
  merchant: string;
  category: string;
  agentId: string;
  currency?: string;
  metadata?: Record<string, unknown>;
}
