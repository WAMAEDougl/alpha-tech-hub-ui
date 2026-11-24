import { SignJWT, jwtVerify } from "jose";
import { prisma } from "./prisma";
import { config } from "./config";
import { UnauthorizedException } from "./http";
import type { UserRole } from "./roles";

export type AuthUser = {
  id: string; email: string; name: string; phone: string | null; role: UserRole | string; isActive: boolean; createdAt: Date;
};

function secret() {
  const s = config.get("JWT_SECRET");
  // Refuse a missing or guessable secret: tokens signed with it would let anyone forge an admin login.
  if (!s || s.length < 32 || s.startsWith("your-super-secret")) {
    throw new Error("JWT_SECRET must be set to a random string of at least 32 characters");
  }
  return new TextEncoder().encode(s);
}

export async function signToken(user: { id: string; email: string; role: string }) {
  return new SignJWT({ email: user.email, role: user.role })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(user.id)
    .setIssuedAt()
    .setExpirationTime(config.get("JWT_EXPIRES_IN", "12h") as string)
    .sign(secret());
}

/** Reads the bearer token and loads the user fresh from the database, so a deactivated or re-roled account takes effect at once. */
export async function authenticate(req: Request): Promise<AuthUser | null> {
  const header = req.headers.get("authorization") ?? "";
  if (!header.toLowerCase().startsWith("bearer ")) return null;
  try {
    const { payload } = await jwtVerify(header.slice(7).trim(), secret());
    if (!payload.sub) return null;
    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
      select: { id: true, email: true, name: true, phone: true, role: true, isActive: true, createdAt: true },
    });
    return user && user.isActive ? user : null;
  } catch (e) {
    if (e instanceof Error && e.message.startsWith("JWT_SECRET")) throw e; // misconfiguration is a server problem, not a bad login
    return null;
  }
}

export function requireUser(user: AuthUser | null): AuthUser {
  if (!user) throw new UnauthorizedException("Sign in to continue");
  return user;
}
