import 'dotenv/config';
import { OutboxService } from '../modules/outbox/outbox.service';
import { enqueueJob } from '../infrastructure/job-queue';
import { getRedisClient } from '../infrastructure/redis';

const POLL_INTERVAL_MS = 2000;
const BATCH_SIZE = 100;

async function relayBatch(): Promise<number> {
  const pending = await OutboxService.fetchPending(BATCH_SIZE);
  let dispatched = 0;

  for (const row of pending) {
    // Exactly one job per outbox row
    await enqueueJob({
      queue: row.eventType, // e.g., "payment.failed"
      payload: {
        outboxId: row.id,
        aggregateId: row.aggregateId,
        ...((row.payload as Record<string, unknown>) || {}),
      },
    });

    await OutboxService.markDispatched(row.id);
    dispatched++;
  }

  return dispatched;
}

async function runRelay() {
  console.log('[OutboxRelay] Starting...');
  const redis = await getRedisClient();

  // Graceful shutdown
  let shuttingDown = false;
  process.on('SIGINT', () => {
    shuttingDown = true;
    console.log('[OutboxRelay] SIGINT received, draining...');
  });
  process.on('SIGTERM', () => {
    shuttingDown = true;
    console.log('[OutboxRelay] SIGTERM received, draining...');
  });

  while (!shuttingDown) {
    try {
      const count = await relayBatch();
      if (count > 0) {
        console.log(`[OutboxRelay] Dispatched ${count} events`);
      }
    } catch (e) {
      console.error('[OutboxRelay] Batch error:', e);
    }
    await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
  }

  await redis.quit();
  console.log('[OutboxRelay] Stopped.');
}

// Also run a diagnosis worker that listens on a dedicated queue
async function runDiagnosisWorker() {
  console.log('[DiagnosisWorker] Starting...');
  const redis = await getRedisClient();

  while (true) {
    const data = await redis.brPop(`queue:diagnosis.request`, 5);
    if (data) {
      const job = JSON.parse(data.element);
      console.log('[DiagnosisWorker] Running diagnosis for request:', job.id);
      // Import dynamically to avoid circular deps
      const { runSystemDiagnosis } = await import('../modules/agent/diagnosis');
      const report = await runSystemDiagnosis();
      await redis.set(`diagnosis:result:${job.payload.requestId}`, JSON.stringify(report), {
        EX: 300,
      });
    }
  }
}

// Entry point: choose mode via CLI arg
const mode = process.argv[2] || 'relay';

if (mode === 'relay') {
  runRelay();
} else if (mode === 'diagnosis') {
  runDiagnosisWorker();
} else if (mode === 'both') {
  runRelay();
  runDiagnosisWorker();
} else {
  console.error(`Unknown mode: ${mode}. Use: relay | diagnosis | both`);
  process.exit(1);
}
