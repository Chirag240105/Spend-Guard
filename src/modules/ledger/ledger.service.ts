import { Prisma, PrismaClient } from '@prisma/client';
export async function postBalancedLedger(tx: Prisma.TransactionClient, paymentId: string, amount: Prisma.Decimal | number, debitAccountId: string, creditAccountId: string) {
  const ledger = await tx.ledgerTransaction.create({ data: { paymentId } });
  await tx.ledgerEntry.createMany({ data: [{ ledgerTransactionId: ledger.id, accountId: debitAccountId, type: 'debit', amount }, { ledgerTransactionId: ledger.id, accountId: creditAccountId, type: 'credit', amount }] });
  return ledger;
}
export async function checkLedgerInvariants(prisma: PrismaClient) {
  const rows = await prisma.$queryRaw<Array<{ id: string; debit: Prisma.Decimal | null; credit: Prisma.Decimal | null }>>`SELECT lt.id, SUM(CASE WHEN le.type = 'debit' THEN le.amount ELSE 0 END) debit, SUM(CASE WHEN le.type = 'credit' THEN le.amount ELSE 0 END) credit FROM "LedgerTransaction" lt LEFT JOIN "LedgerEntry" le ON le."ledgerTransactionId" = lt.id GROUP BY lt.id`;
  return rows.filter(r => String(r.debit ?? 0) !== String(r.credit ?? 0));
}
