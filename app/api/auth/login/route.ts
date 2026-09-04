import { NextRequest, NextResponse } from 'next/server';
import { AuthService, AuthError } from '@/src/modules/auth/auth.service';
import { z } from 'zod';

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export async function POST(req: NextRequest) {
  try {
    const body = schema.parse(await req.json());
    const { token, user } = await AuthService.login(body.email, body.password);

    const res = NextResponse.json({ user }, { status: 200 });
    res.cookies.set(AuthService.cookieName, token, AuthService.cookieOpts);
    return res;
  } catch (e) {
    if (e instanceof AuthError) {
      return NextResponse.json({ error: e.message }, { status: 401 });
    }
    if (e instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }
    console.error('Login error:', e);
    return NextResponse.json({ error: 'Login failed' }, { status: 500 });
  }
}
