import { PrismaClient } from "@prisma/client";

// One client per server instance. In development the module is reloaded often, so keep it on globalThis
// to avoid opening a new connection pool on every edit.
const g = globalThis as unknown as { __prisma?: PrismaClient };

export const prisma: PrismaClient = g.__prisma ?? new PrismaClient();
if (process.env.NODE_ENV !== "production") g.__prisma = prisma;

/** The services were written against a PrismaService; it is just the client. */
export type PrismaService = PrismaClient;
