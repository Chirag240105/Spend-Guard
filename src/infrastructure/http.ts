import { NextResponse } from 'next/server';
export const requestId = () => crypto.randomUUID();
export function apiError(code: string, message: string, status = 400) {
  return NextResponse.json({ code, message, requestId: requestId() }, { status });
}
