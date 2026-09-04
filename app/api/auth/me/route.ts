import { NextRequest, NextResponse } from 'next/server';
import { getAuthFromRequest, AuthService } from '@/src/modules/auth/auth.service';

export async function GET(req: NextRequest) {
  const auth = getAuthFromRequest(req);
  if (!auth) return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 });

  const user = await AuthService.getMe(auth.sub);
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

  return NextResponse.json({ user });
}
