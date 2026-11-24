import type { NextRequest } from "next/server";
import { ZodError, type ZodTypeAny, type z } from "zod";
import { authenticate, requireUser, type AuthUser } from "./auth";
import { BadRequestException, ForbiddenException, HttpError, NotFoundException } from "./http";
import { clientIp, rateLimit } from "./rate-limit";
import { UserRole } from "./roles";

/** Who may call a route: anyone, anyone (but we read the token if there is one), any signed-in user, or specific roles. */
export type Access = "public" | "optional" | "user" | UserRole[];

export const STAFF = [UserRole.ADMIN, UserRole.INVENTORY];
export const ADMIN = [UserRole.ADMIN];

export interface Ctx<B = unknown> {
  req: NextRequest;
  params: Record<string, string>;
  query: URLSearchParams;
  user: AuthUser | null;
  body: B;
}

interface Opts<S extends ZodTypeAny | undefined> {
  access?: Access;
  body?: S;
  /** e.g. { key: "login", limit: 8, windowMs: 60_000 } counted per client address */
  limit?: { key: string; limit: number; windowMs: number };
}

type Handler<S extends ZodTypeAny | undefined> = (ctx: Ctx<S extends ZodTypeAny ? z.infer<S> : undefined>) => Promise<unknown> | unknown;

interface Route {
  method: string;
  segments: string[];
  access: Access;
  body?: ZodTypeAny;
  limit?: Opts<undefined>["limit"];
  handler: (ctx: Ctx<any>) => Promise<unknown> | unknown;
}

function formatZod(e: ZodError): string[] {
  return e.issues.map(i => {
    if (i.code === "unrecognized_keys") return `property ${i.keys.join(", ")} should not exist`;
    const path = i.path.filter(p => typeof p === "string").join(".");
    return path ? `${path}: ${i.message}` : i.message;
  });
}

export class Router {
  private routes: Route[] = [];

  private add<S extends ZodTypeAny | undefined = undefined>(method: string, pattern: string, opts: Opts<S>, handler: Handler<S>) {
    this.routes.push({
      method, segments: pattern.split("/").filter(Boolean), access: opts.access ?? "public",
      body: opts.body, limit: opts.limit, handler: handler as Route["handler"],
    });
  }
  get<S extends ZodTypeAny | undefined = undefined>(p: string, o: Opts<S>, h: Handler<S>) { this.add("GET", p, o, h); }
  post<S extends ZodTypeAny | undefined = undefined>(p: string, o: Opts<S>, h: Handler<S>) { this.add("POST", p, o, h); }
  patch<S extends ZodTypeAny | undefined = undefined>(p: string, o: Opts<S>, h: Handler<S>) { this.add("PATCH", p, o, h); }
  delete<S extends ZodTypeAny | undefined = undefined>(p: string, o: Opts<S>, h: Handler<S>) { this.add("DELETE", p, o, h); }

  private match(method: string, parts: string[]) {
    let pathMatched = false;
    for (const r of this.routes) {
      if (r.segments.length !== parts.length) continue;
      const params: Record<string, string> = {};
      let ok = true;
      for (let i = 0; i < parts.length; i++) {
        const seg = r.segments[i];
        if (seg.startsWith(":")) params[seg.slice(1)] = decodeURIComponent(parts[i]);
        else if (seg !== parts[i]) { ok = false; break; }
      }
      if (!ok) continue;
      pathMatched = true;
      if (r.method === method) return { route: r, params };
    }
    return { route: null, params: {}, pathMatched };
  }

  async handle(req: NextRequest, parts: string[]): Promise<Response> {
    try {
      const { route, params, pathMatched } = this.match(req.method, parts) as { route: Route | null; params: Record<string, string>; pathMatched?: boolean };
      if (!route) {
        if (pathMatched) return json({ message: "Method not allowed", error: "Method Not Allowed", statusCode: 405 }, 405);
        throw new NotFoundException(`Cannot ${req.method} /api/${parts.join("/")}`);
      }

      if (route.limit) await rateLimit(`${route.limit.key}:${clientIp(req)}`, route.limit.limit, route.limit.windowMs);

      // authentication
      let user: AuthUser | null = null;
      if (route.access !== "public") {
        user = await authenticate(req);
        if (route.access !== "optional") {
          requireUser(user);
          if (Array.isArray(route.access) && !route.access.includes(user!.role as UserRole)) {
            throw new ForbiddenException("Forbidden resource");
          }
        }
      }

      // body
      let body: unknown = undefined;
      if (route.body) {
        let raw: unknown = {};
        const text = await req.text();
        if (text.trim()) {
          try { raw = JSON.parse(text); } catch { throw new BadRequestException("Send a JSON body"); }
        }
        const parsed = route.body.safeParse(raw ?? {});
        if (!parsed.success) throw new BadRequestException(formatZod(parsed.error));
        body = parsed.data;
      }

      const result = await route.handler({ req, params, query: req.nextUrl.searchParams, user, body });
      if (result instanceof Response) return result;
      const status = req.method === "POST" ? 201 : 200;
      return result === undefined ? new Response(null, { status }) : json(result, status);
    } catch (e) {
      return errorResponse(e);
    }
  }
}

export function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { "Content-Type": "application/json", "Cache-Control": "no-store" } });
}

function errorResponse(e: unknown): Response {
  if (e instanceof HttpError) return json(e.toJSON(), e.statusCode);
  // Prisma "record not found" on update/delete
  if (typeof e === "object" && e && (e as { code?: string }).code === "P2025") return json({ message: "Not found", error: "Not Found", statusCode: 404 }, 404);
  if (typeof e === "object" && e && (e as { code?: string }).code === "P2002") return json({ message: "That already exists", error: "Conflict", statusCode: 409 }, 409);
  console.error("API error:", e);
  return json({ message: "Internal server error", statusCode: 500 }, 500);
}
