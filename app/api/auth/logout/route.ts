import { NextResponse } from 'next/server';
import { AuthService } from '@/src/modules/auth/auth.service';

export async function POST() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(AuthService.cookieName, '', { ...AuthService.cookieOpts, maxAge: 0 });
  return res;
}
