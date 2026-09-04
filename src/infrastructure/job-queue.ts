import { getRedisClient } from './redis';

export interface JobPayload {
  queue: string;
  payload: unknown;
  opts?: { delay?: number; priority?: number };
}

export async function enqueueJob(job: JobPayload): Promise<string> {
  const redis = await getRedisClient();
  const jobId = `${job.queue}:${Date.now()}:${Math.random().toString(36).slice(2)}`;
  const data = JSON.stringify({
    id: jobId,
    payload: job.payload,
    opts: job.opts,
    enqueuedAt: new Date().toISOString(),
  });
  await redis.lPush(`queue:${job.queue}`, data);
  return jobId;
}

export async function getQueueLength(queue: string): Promise<number> {
  const redis = await getRedisClient();
  return redis.lLen(`queue:${queue}`);
}
