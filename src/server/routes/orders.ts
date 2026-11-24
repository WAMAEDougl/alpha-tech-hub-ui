import { z } from "zod";
import { STAFF, type Router } from "../router";
import { orders, pricing, workflow } from "../container";
import { createOrderSchema, quoteSchema } from "../dto";

const obj = <T extends z.ZodRawShape>(s: T) => z.object(s).strict();
// every action may carry the order's last-seen update time: a stale screen is refused
const exp = { expectedUpdatedAt: z.string().optional() };
const actor = (u: { id: string; role: string }) => ({ id: u.id, role: u.role });

const justExpected = obj(exp);
const withNote = obj({ note: z.string(), ...exp });

export function registerOrders(r: Router) {
  // ── public: customers (guest or signed in) ──────────────────────────────
  r.post("/orders/quote", { body: quoteSchema, limit: { key: "quote", limit: 60, windowMs: 60_000 } }, ({ body }) => pricing.quote(body));

  r.post("/orders", { access: "optional", body: createOrderSchema, limit: { key: "order", limit: 10, windowMs: 60_000 } },
    ({ body, user }) => orders.create(body, user?.id));

  r.get("/orders/track", { limit: { key: "track", limit: 20, windowMs: 60_000 } },
    ({ query }) => orders.track(query.get("orderNumber") ?? "", query.get("phone") ?? ""));

  r.post("/orders/payment-reference", {
    access: "optional", limit: { key: "payref", limit: 10, windowMs: 60_000 },
    body: obj({ orderNumber: z.string(), phone: z.string().optional(), code: z.string() }),
  }, ({ body, user }) => orders.submitPaymentReference(body.orderNumber, body.phone ?? "", body.code, user ?? undefined));

  // ── staff: queues (static paths first, so they are not read as an order id) ─
  r.get("/orders", { access: STAFF }, ({ query }) => orders.findAll({ lane: query.get("lane") ?? undefined, search: query.get("search") ?? undefined }));
  r.get("/orders/counts", { access: STAFF }, () => orders.counts());
  r.get("/orders/new", { access: STAFF }, ({ query, user }) => {
    const since = query.get("since");
    const d = since ? new Date(since) : new Date();
    return orders.newSince(isNaN(d.getTime()) ? new Date() : d, user!.role as string);
  });
  r.get("/orders/:id", { access: STAFF }, ({ params }) => orders.findOne(params.id));

  // ── staff: order actions (the service decides office-only vs inventory) ──
  r.post("/orders/:id/verify-payment", { access: STAFF, body: obj({ code: z.string().optional(), ...exp }) },
    ({ params, body, user }) => workflow.verifyPayment(params.id, actor(user!), body.code, body.expectedUpdatedAt));
  r.post("/orders/:id/reject-payment", { access: STAFF, body: withNote },
    ({ params, body, user }) => workflow.rejectPayment(params.id, actor(user!), body.note, body.expectedUpdatedAt));
  r.post("/orders/:id/delivery", { access: STAFF, body: obj({ zoneId: z.string().uuid().optional(), fee: z.coerce.number().min(0).optional(), ...exp }) },
    ({ params, body, user }) => workflow.setDelivery(params.id, actor(user!), { zoneId: body.zoneId, fee: body.fee }, body.expectedUpdatedAt));
  r.post("/orders/:id/approve", { access: STAFF, body: justExpected },
    ({ params, body, user }) => workflow.approve(params.id, actor(user!), body.expectedUpdatedAt));
  r.post("/orders/:id/issue", { access: STAFF, body: obj({ text: z.string(), ...exp }) },
    ({ params, body, user }) => workflow.reportIssue(params.id, actor(user!), body.text));
  r.post("/orders/:id/resolve-issue", { access: STAFF, body: obj({ decision: z.string(), ...exp }) },
    ({ params, body, user }) => workflow.resolveIssue(params.id, actor(user!), body.decision));
  r.post("/orders/:id/start-packing", { access: STAFF, body: justExpected },
    ({ params, body, user }) => workflow.startPacking(params.id, actor(user!), body.expectedUpdatedAt));
  r.post("/orders/:id/mark-packed", { access: STAFF, body: justExpected },
    ({ params, body, user }) => workflow.markPacked(params.id, actor(user!), body.expectedUpdatedAt));
  r.post("/orders/:id/dispatch", { access: STAFF, body: obj({ riderName: z.string(), riderPhone: z.string(), ...exp }) },
    ({ params, body, user }) => workflow.dispatch(params.id, actor(user!), { name: body.riderName, phone: body.riderPhone }, body.expectedUpdatedAt));
  r.post("/orders/:id/ready-pickup", { access: STAFF, body: justExpected },
    ({ params, body, user }) => workflow.readyPickup(params.id, actor(user!), body.expectedUpdatedAt));
  r.post("/orders/:id/complete", { access: STAFF, body: obj({ collectPayment: z.boolean().optional(), ...exp }) },
    ({ params, body, user }) => workflow.complete(params.id, actor(user!), !!body.collectPayment, body.expectedUpdatedAt));
  r.post("/orders/:id/failed-delivery", { access: STAFF, body: withNote },
    ({ params, body, user }) => workflow.failedDelivery(params.id, actor(user!), body.note, body.expectedUpdatedAt));
  r.post("/orders/:id/cancel", { access: STAFF, body: withNote },
    ({ params, body, user }) => workflow.cancel(params.id, actor(user!), body.note, body.expectedUpdatedAt));

  // ── staff: per-line warehouse actions ───────────────────────────────────
  r.post("/orders/items/:itemId/source", {
    access: STAFF,
    body: obj({
      source: z.enum(["warehouse", "supplier"]), quantity: z.coerce.number().int().min(1),
      receiptId: z.string().uuid().optional(), supplierId: z.string().uuid().optional(),
      unitCost: z.coerce.number().min(0).optional(), reference: z.string().optional(), ...exp,
    }),
  }, ({ params, body, user }) => workflow.sourceItem(params.itemId, actor(user!), body, body.expectedUpdatedAt));
  r.post("/orders/items/:itemId/plan", {
    access: STAFF, body: obj({ supplierId: z.string().uuid().optional(), expectedDate: z.string().optional(), note: z.string().optional(), ...exp }),
  }, ({ params, body, user }) => workflow.planSource(params.itemId, actor(user!), body));
  r.post("/orders/items/:itemId/check", { access: STAFF, body: obj({ checked: z.boolean(), ...exp }) },
    ({ params, body, user }) => workflow.checkItem(params.itemId, actor(user!), body.checked));
}
