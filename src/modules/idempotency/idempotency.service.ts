import { createHash } from 'crypto';
import { getPrismaClient } from '@/src/infrastructure/database';
export const hashRequest = (body: unknown) =>
  createHash('sha256').update(JSON.stringify(body)).digest('hex');
export async function beginIdempotency(key: string, endpoint: string, body: unknown) {
  const prisma = getPrismaClient(),
    requestHash = hashRequest(body);
  try {
    const record = await prisma.idempotencyKey.create({ data: { key, endpoint, requestHash } });
    return { kind: 'new' as const, record };
  } catch {
    const record = await prisma.idempotencyKey.findUniqueOrThrow({
      where: { key_endpoint: { key, endpoint } },
    });
    if (record.requestHash !== requestHash)
      throw new Error('Idempotency key reused with a different request');
    return { kind: 'existing' as const, record };
  }
}
export async function completeIdempotency(id: string, response: unknown) {
  return getPrismaClient().idempotencyKey.update({
    where: { id },
    data: { status: 'COMPLETED', responseBody: response as object },
  });
}
