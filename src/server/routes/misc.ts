import { timingSafeEqual } from "crypto";
import { z } from "zod";
import { ADMIN, type Router } from "../router";
import { ForbiddenException, NotFoundException } from "../http";
import { prisma } from "../prisma";
import { analytics, orders, payments, repairs } from "../container";
import { config } from "../config";
import { createRepairSchema, updateRepairSchema } from "../dto";
import { journeyStage, tabOf } from "../journey";
import { normalizePhone } from "../phone";

const obj = <T extends z.ZodRawShape>(s: T) => z.object(s).strict();

export function registerMisc(r: Router) {
  // ── "my account": the signed-in customer's own orders and saved addresses ─
  r.get("/me", { access: "user" }, ({ user }) => ({ id: user!.id, name: user!.name, email: user!.email, phone: user!.phone, role: user!.role }));

  r.get("/me/orders", { access: "user" }, async ({ user, query }) => {
    const rows = await prisma.order.findMany({ where: { userId: user!.id }, orderBy: { createdAt: "desc" }, take: 100, include: { items: true } });
    const list = rows.map(o => {
      const stage = journeyStage(o);
      return {
        orderNumber: o.orderNumber, createdAt: o.createdAt, totalAmount: Number(o.totalAmount),
        journeyStage: stage, tab: tabOf(stage), itemCount: o.items.reduce((s, i) => s + i.quantity, 0),
        items: o.items.slice(0, 3).map(i => i.productName), moreItems: Math.max(0, o.items.length - 3),
        needsPayment: stage === "to_pay",
      };
    });
    const tab = query.get("tab");
    return tab && tab !== "all" ? list.filter(o => o.tab === tab) : list;
  });

  r.get("/me/orders/:orderNumber", { access: "user" }, async ({ user, params }) => {
    const o = await prisma.order.findFirst({ where: { orderNumber: params.orderNumber.toUpperCase(), userId: user!.id }, select: { id: true } });
    if (!o) throw new NotFoundException("Order not found");
    return orders.publicView(await orders.loadPublic(o.id));
  });

  r.get("/me/addresses", { access: "user" }, ({ user }) =>
    prisma.customerAddress.findMany({ where: { userId: user!.id }, orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }] }));

  r.post("/me/addresses", {
    access: "user",
    body: obj({
      label: z.string().optional(), fullName: z.string().min(2), phone: z.string().min(9), area: z.string().min(2), addressLine: z.string().min(3),
      zoneId: z.string().uuid().optional(), isDefault: z.boolean().optional(),
    }),
  }, async ({ user, body }) => {
    const phone = normalizePhone(body.phone);
    if (!phone) throw new NotFoundException("Enter a valid phone number");
    const count = await prisma.customerAddress.count({ where: { userId: user!.id } });
    const makeDefault = body.isDefault || count === 0;
    return prisma.$transaction(async tx => {
      if (makeDefault) await tx.customerAddress.updateMany({ where: { userId: user!.id }, data: { isDefault: false } });
      return tx.customerAddress.create({
        data: { userId: user!.id, label: body.label?.trim() || "Home", fullName: body.fullName.trim(), phone, area: body.area.trim(), addressLine: body.addressLine.trim(), zoneId: body.zoneId ?? null, isDefault: makeDefault },
      });
    });
  });

  r.delete("/me/addresses/:id", { access: "user" }, async ({ user, params }) => {
    const res = await prisma.customerAddress.deleteMany({ where: { id: params.id, userId: user!.id } });
    if (!res.count) throw new NotFoundException("Address not found");
    return { deleted: true };
  });

  r.patch("/me/addresses/:id/default", { access: "user", body: obj({}).optional() }, async ({ user, params }) => {
    const a = await prisma.customerAddress.findFirst({ where: { id: params.id, userId: user!.id } });
    if (!a) throw new NotFoundException("Address not found");
    await prisma.$transaction([
      prisma.customerAddress.updateMany({ where: { userId: user!.id }, data: { isDefault: false } }),
      prisma.customerAddress.update({ where: { id: params.id }, data: { isDefault: true } }),
    ]);
    return { ok: true };
  });

  // ── payments ────────────────────────────────────────────────────────────
  r.post("/payments/mpesa/stk", {
    body: obj({ orderNumber: z.string(), phone: z.string() }), limit: { key: "stk", limit: 5, windowMs: 60_000 },
  }, ({ body }) => payments.initiateStkPush(body.orderNumber, body.phone));

  // The secret in the address is how we know the call really came from our Safaricom registration.
  r.post("/payments/mpesa/callback/:token", {}, async ({ req, params }) => {
    const expected = config.get("MPESA_CALLBACK_TOKEN") || "";
    const a = Buffer.from(params.token); const b = Buffer.from(expected);
    if (!expected || a.length !== b.length || !timingSafeEqual(a, b)) throw new ForbiddenException();
    return payments.handleCallback(await req.json().catch(() => ({})));
  });

  // ── repair bookings ─────────────────────────────────────────────────────
  r.post("/repairs", { access: "optional", body: createRepairSchema }, ({ body, user }) => repairs.create(body, user?.id));
  r.get("/repairs/track/:ticketNumber", {}, ({ params }) => repairs.trackByTicketNumber(params.ticketNumber));
  r.get("/repairs", { access: ADMIN }, () => repairs.findAll());
  r.get("/repairs/:id", { access: ADMIN }, ({ params }) => repairs.findOne(params.id));
  r.patch("/repairs/:id", { access: ADMIN, body: updateRepairSchema }, ({ params, body }) => repairs.update(params.id, body));

  // ── custom build requests, disposal requests, quick quotes ──────────────
  const status = obj({ status: z.string() });
  r.post("/build-requests", {
    body: obj({ name: z.string(), phone: z.string(), email: z.string().email().optional(), buildType: z.string(), budget: z.string(), useCases: z.array(z.string()).optional(), notes: z.string().optional() }),
  }, ({ body }) => prisma.buildRequest.create({ data: body }));
  r.get("/build-requests", { access: ADMIN }, () => prisma.buildRequest.findMany({ orderBy: { submittedAt: "desc" } }));
  r.patch("/build-requests/:id/status", { access: ADMIN, body: status }, ({ params, body }) => prisma.buildRequest.update({ where: { id: params.id }, data: { status: body.status } }));
  r.delete("/build-requests/:id", { access: ADMIN }, ({ params }) => prisma.buildRequest.delete({ where: { id: params.id } }));

  r.post("/disposal", {
    body: obj({ name: z.string(), phone: z.string(), email: z.string().email().optional(), items: z.string(), quantity: z.coerce.number().int().optional(), preferredDate: z.string().optional(), notes: z.string().optional() }),
  }, ({ body }) => prisma.disposalRequest.create({ data: body }));
  r.get("/disposal", { access: ADMIN }, () => prisma.disposalRequest.findMany({ orderBy: { submittedAt: "desc" } }));
  r.patch("/disposal/:id/status", { access: ADMIN, body: status }, ({ params, body }) => prisma.disposalRequest.update({ where: { id: params.id }, data: { status: body.status } }));
  r.delete("/disposal/:id", { access: ADMIN }, ({ params }) => prisma.disposalRequest.delete({ where: { id: params.id } }));

  r.post("/quotes", { body: obj({ name: z.string(), phone: z.string(), interest: z.string(), message: z.string().optional() }) }, ({ body }) => prisma.quoteRequest.create({ data: body }));
  r.get("/quotes", { access: ADMIN }, () => prisma.quoteRequest.findMany({ orderBy: { createdAt: "desc" } }));
  r.delete("/quotes/:id", { access: ADMIN }, ({ params }) => prisma.quoteRequest.delete({ where: { id: params.id } }));

  // ── dashboard figures ───────────────────────────────────────────────────
  r.get("/analytics/dashboard", { access: ADMIN }, () => analytics.getDashboardStats());
}
