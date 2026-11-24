import type { NextRequest } from "next/server";
import { router } from "@/server/routes";

// Prisma and bcrypt need the Node.js runtime (not the edge runtime).
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// Image uploads and the heavier order actions can take a few seconds.
export const maxDuration = 30;

type Params = { params: Promise<{ path: string[] }> };

async function handle(req: NextRequest, { params }: Params) {
  const { path } = await params;
  return router.handle(req, path ?? []);
}

export const GET = handle;
export const POST = handle;
export const PATCH = handle;
export const PUT = handle;
export const DELETE = handle;
