import 'dotenv/config';
import { getPrismaClient, disconnectPrisma } from '../src/infrastructure/database';
import { checkLedgerInvariants } from '../src/modules/ledger/ledger.service';

async function main() {
  const mismatches = await checkLedgerInvariants(getPrismaClient());
  console.log(`${mismatches.length} mismatches`);
  if (mismatches.length) process.exitCode = 1;
}
main().finally(disconnectPrisma);
