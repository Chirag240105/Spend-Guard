import { NextRequest, NextResponse } from 'next/server';

type WindowEntry = { count: number; resetAt: number };
const windows = new Map<string, WindowEntry>();

/** Optional API-key gate. Set SPEND_GUARD_API_KEY outside local development. */
export function requireApiKey(request: NextRequest): NextResponse | null {
  const expected = process.env.SPEND_GUARD_API_KEY;
  if (!expected || request.headers.get('x-api-key') === expected) return null;
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}

/** Process-local rate limit suitable for a single Next.js instance. */
export function rateLimit(
  request: NextRequest,
  bucket: string,
  limit = 20,
  windowMs = 60_000,
): NextResponse | null {
  const key = `${bucket}:${request.headers.get('x-forwarded-for') ?? request.headers.get('x-real-ip') ?? 'local'}`;
  const now = Date.now();
  const current = windows.get(key);
  const entry =
    !current || current.resetAt <= now ? { count: 0, resetAt: now + windowMs } : current;
  entry.count += 1;
  windows.set(key, entry);
  if (entry.count <= limit) return null;
  return NextResponse.json(
    { error: 'Too many requests. Please try again shortly.' },
    { status: 429, headers: { 'Retry-After': String(Math.ceil((entry.resetAt - now) / 1000)) } },
  );
}

export function logRoute(event: string, details: Record<string, unknown> = {}) {
  console.info(
    JSON.stringify({ level: 'info', event, timestamp: new Date().toISOString(), ...details }),
  );
}

export function pagination(searchParams: URLSearchParams, defaultLimit = 25, maxLimit = 100) {
  const page = Math.max(1, Number(searchParams.get('page') ?? 1) || 1);
  const limit = Math.min(
    maxLimit,
    Math.max(1, Number(searchParams.get('limit') ?? defaultLimit) || defaultLimit),
  );
  return { page, limit, skip: (page - 1) * limit };
}
