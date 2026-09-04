import 'dotenv/config';
import { getPrismaClient } from '../src/infrastructure/database';
import { getRedisClient } from '../src/infrastructure/redis';
import { OutboxService } from '../src/modules/outbox/outbox.service';
import { enqueueJob, getQueueLength } from '../src/infrastructure/job-queue';

async function main() {
  const prisma = getPrismaClient();
  const redis = await getRedisClient();

  console.log('=== Step 1: Seed a payment.failed outbox row ===');
  const outboxId = await OutboxService.enqueue({
    eventType: 'payment.failed',
    aggregateId: `txn_test_${Date.now()}`,
    payload: { amount: 999, reason: 'Test verification' },
  });
  console.log('Created outbox row:', outboxId);

  console.log('\n=== Step 2: Run one relay batch manually ===');
  const pending = await OutboxService.fetchPending(10);
  console.log('Pending rows:', pending.length);

  for (const row of pending) {
    await enqueueJob({
      queue: row.eventType,
      payload: { outboxId: row.id, ...((row.payload as object) || {}) },
    });
    await OutboxService.markDispatched(row.id);
    console.log(`Dispatched ${row.id} -> queue:${row.eventType}`);
  }

  console.log('\n=== Step 3: Verify exactly one job in queue ===');
  const queueLen = await getQueueLength('payment.failed');
  console.log(`Queue "payment.failed" length: ${queueLen}`);

  const outboxRow = await prisma.outbox.findUnique({ where: { id: outboxId } });
  console.log('Outbox status:', outboxRow?.status);

  if (queueLen === 1 && outboxRow?.status === 'dispatched') {
    console.log('\n✅ VERIFICATION PASSED');
  } else {
    console.log('\n❌ VERIFICATION FAILED');
    process.exit(1);
  }

  await redis.quit();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});