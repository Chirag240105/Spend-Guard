import { Prisma, Transaction as PrismaTransaction } from '@prisma/client';
import { getPrismaClient } from '../../infrastructure/database';
import { Transaction, TransactionInput } from './transaction.types';

/**
 * Transaction Service - manages transaction recording
 */
export class TransactionService {
  /**
   * Create a new transaction
   */
  static async createTransaction(policyId: string, input: TransactionInput): Promise<Transaction> {
    const prisma = getPrismaClient();

    const transaction = await prisma.transaction.create({
      data: {
        amount: input.amount,
        currency: input.currency || 'INR',
        merchant: input.merchant,
        category: input.category,
        agentId: input.agentId,
        metadata: (input.metadata || {}) as Prisma.InputJsonValue,
        policyId,
      },
    });

    return this.mapDatabaseTransactionToDomain(transaction);
  }

  /**
   * Get a transaction by ID
   */
  static async getTransactionById(transactionId: string): Promise<Transaction | null> {
    const prisma = getPrismaClient();
    const transaction = await prisma.transaction.findUnique({
      where: { id: transactionId },
    });

    return transaction ? this.mapDatabaseTransactionToDomain(transaction) : null;
  }

  /**
   * Get all transactions for a policy
   */
  static async getTransactionsByPolicyId(
    policyId: string,
    limit: number = 50,
  ): Promise<Transaction[]> {
    const prisma = getPrismaClient();
    const transactions = await prisma.transaction.findMany({
      where: { policyId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    return transactions.map((t) => this.mapDatabaseTransactionToDomain(t));
  }

  /**
   * Get all transactions for an agent
   */
  static async getTransactionsByAgentId(
    agentId: string,
    limit: number = 50,
  ): Promise<Transaction[]> {
    const prisma = getPrismaClient();
    const transactions = await prisma.transaction.findMany({
      where: { agentId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    return transactions.map((t) => this.mapDatabaseTransactionToDomain(t));
  }

  private static mapDatabaseTransactionToDomain(transaction: PrismaTransaction): Transaction {
    return {
      id: transaction.id,
      amount: transaction.amount,
      currency: transaction.currency,
      merchant: transaction.merchant,
      category: transaction.category,
      timestamp: transaction.timestamp,
      agentId: transaction.agentId,
      metadata: transaction.metadata as Record<string, unknown> | undefined,
      policyId: transaction.policyId,
      createdAt: transaction.createdAt,
    };
  }
}
