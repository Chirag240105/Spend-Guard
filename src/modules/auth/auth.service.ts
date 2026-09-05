import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { NextResponse } from 'next/server';
import { getPrismaClient } from '@/src/infrastructure/database';

const JWT_SECRET = process.env.JWT_SECRET ?? 'spendguard-dev-secret-change-in-production';
const JWT_EXPIRES_IN = '8h';
const COOKIE_NAME = 'sg_token';

export interface JwtPayload {
  sub: string; // user id
  email: string;
  name: string;
  role: string;
  iat?: number;
  exp?: number;
}

export class AuthService {
  static async login(
    email: string,
    password: string,
  ): Promise<{ token: string; user: PublicUser }> {
    const prisma = getPrismaClient();
    const user = await prisma.user.findUnique({ where: { email: email.toLowerCase().trim() } });
    if (!user) throw new AuthError('Invalid email or password');

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) throw new AuthError('Invalid email or password');

    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    };
    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
    return { token, user: toPublicUser(user) };
  }

  static verifyToken(token: string): JwtPayload {
    try {
      return jwt.verify(token, JWT_SECRET) as JwtPayload;
    } catch {
      throw new AuthError('Invalid or expired session');
    }
  }

  static async getMe(userId: string): Promise<PublicUser | null> {
    const prisma = getPrismaClient();
    const user = await prisma.user.findUnique({ where: { id: userId } });
    return user ? toPublicUser(user) : null;
  }

  static async createUser(
    email: string,
    name: string,
    password: string,
    role = 'REVIEWER',
  ): Promise<PublicUser> {
    const prisma = getPrismaClient();
    const passwordHash = await bcrypt.hash(password, 12);
    const user = await prisma.user.create({
      data: { email: email.toLowerCase().trim(), name, passwordHash, role },
    });
    return toPublicUser(user);
  }

  static cookieName = COOKIE_NAME;
  static cookieOpts = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path: '/',
    maxAge: 8 * 60 * 60,
  };
}

export class AuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AuthError';
  }
}

export interface PublicUser {
  id: string;
  email: string;
  name: string;
  role: string;
  createdAt: Date;
}

function toPublicUser(user: {
  id: string;
  email: string;
  name: string;
  role: string;
  createdAt: Date;
}): PublicUser {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    createdAt: user.createdAt,
  };
}

/** Extract and verify JWT from Next.js request cookies/headers */
export function getAuthFromRequest(req: import('next/server').NextRequest): JwtPayload | null {
  try {
    const cookie = req.cookies.get(AuthService.cookieName)?.value;
    const bearer = req.headers.get('authorization')?.replace('Bearer ', '');
    const token = cookie ?? bearer;
    if (!token) return null;
    return AuthService.verifyToken(token);
  } catch {
    return null;
  }
}

/** Middleware helper — returns 401 JSON response if not authenticated */
export function requireAuth(
  req: import('next/server').NextRequest,
): import('next/server').NextResponse | null {
  const auth = getAuthFromRequest(req);
  if (!auth) {
    return NextResponse.json(
      { error: 'Unauthenticated', code: 'UNAUTHENTICATED' },
      { status: 401 },
    );
  }
  return null;
}
