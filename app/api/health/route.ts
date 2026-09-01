import { NextRequest, NextResponse } from 'next/server';

export async function GET(_request: NextRequest) {
  return NextResponse.json({
    status: 'healthy',
    message: 'SpendGuard API is running',
    timestamp: new Date().toISOString(),
  });
}
