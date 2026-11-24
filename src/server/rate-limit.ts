import { prisma } from "./prisma";
import { TooManyRequestsException } from "./http";

/**
 * Fixed-window rate limit kept in Postgres. Serverless functions run as many separate instances, so an
 * in-memory counter would let an attacker simply get a fresh allowance on each one. One atomic upsert per
 * checked request; used only on the sensitive routes (login, checkout, tracking...).
 */
export async function rateLimit(key: string, limit: number, windowMs: number) {
  const resetAt = new Date(Date.now() + windowMs);
  const rows = await prisma.$queryRaw<{ count: number }[]>`
    INSERT INTO rate_limits ("key", "count", "resetAt") VALUES (${key}, 1, ${resetAt})
    ON CONFLICT ("key") DO UPDATE SET
      "count"   = CASE WHEN rate_limits."resetAt" < now() THEN 1 ELSE rate_limits."count" + 1 END,
      "resetAt" = CASE WHEN rate_limits."resetAt" < now() THEN ${resetAt} ELSE rate_limits."resetAt" END
    RETURNING "count"`;
  if ((rows[0]?.count ?? 0) > limit) {
    throw new TooManyRequestsException("Too many attempts. Please wait a minute and try again.");
  }
  // housekeeping: occasionally drop long-expired windows
  if (Math.random() < 0.01) {
    prisma.$executeRaw`DELETE FROM rate_limits WHERE "resetAt" < now() - interval '1 day'`.catch(() => undefined);
  }
}

export function clientIp(req: Request) {
  const fwd = req.headers.get("x-forwarded-for");
  return (fwd ? fwd.split(",")[0].trim() : req.headers.get("x-real-ip")) || "local";
}
