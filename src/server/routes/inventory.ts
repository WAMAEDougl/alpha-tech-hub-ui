import { z } from "zod";
import { StockMovementType } from "@prisma/client";
import { ADMIN, STAFF, type Router } from "../router";
import { inventory, procurement, returns } from "../container";
import { returnRequestSchema } from "../dto";

const obj = <T extends z.ZodRawShape>(s: T) => z.object(s).strict();
const uuid = z.string().uuid();

export function registerInventory(r: Router) {
  // ── stock ───────────────────────────────────────────────────────────────
  r.get("/inventory/stock", { access: STAFF }, ({ query }) => inventory.stockList({ search: query.get("search") ?? undefined, filter: query.get("filter") ?? undefined }));
  r.get("/inventory/movements", { access: STAFF }, ({ query }) => {
    const type = query.get("type");
    const t = type && (Object.values(StockMovementType) as string[]).includes(type) ? (type as StockMovementType) : undefined;
    const limit = query.get("limit");
    return inventory.movements({ productId: query.get("productId") ?? undefined, type: t, limit: limit ? Number(limit) : undefined });
  });
  r.get("/inventory/workflow", { access: STAFF }, () => inventory.workflow());
  r.post("/inventory/receive", {
    access: STAFF,
    body: obj({ productId: uuid, quantity: z.coerce.number().int().min(1), supplier: z.string().optional(), reference: z.string().optional(), costPrice: z.coerce.number().min(0).optional() }),
  }, ({ body, user }) => inventory.receive(user!.id, body));
  r.post("/inventory/write-off", { access: STAFF, body: obj({ productId: uuid, quantity: z.coerce.number().int().min(1), reason: z.string().min(3) }) },
    ({ body, user }) => inventory.writeOff(user!.id, body));
  r.post("/inventory/stock-take", { access: STAFF, body: obj({ productId: uuid, countedQuantity: z.coerce.number().int().min(0), reason: z.string().min(3) }) },
    ({ body, user }) => inventory.stockTake(user!.id, body));

  // ── suppliers & purchasing ──────────────────────────────────────────────
  const supplier = obj({ name: z.string().min(2), phone: z.string().optional(), email: z.string().email().optional(), notes: z.string().optional() });
  r.get("/inventory/suppliers", { access: STAFF }, () => procurement.suppliers());
  r.post("/inventory/suppliers", { access: STAFF, body: supplier }, ({ body }) => procurement.createSupplier(body));
  r.patch("/inventory/suppliers/:id", { access: STAFF, body: supplier.partial().extend({ isActive: z.boolean().optional() }) },
    ({ params, body }) => procurement.updateSupplier(params.id, body));

  r.get("/inventory/purchase-orders", { access: STAFF }, ({ query }) => procurement.purchaseOrders(query.get("status") ?? undefined));
  r.get("/inventory/purchase-orders/:id", { access: STAFF }, ({ params }) => procurement.purchaseOrder(params.id));
  r.post("/inventory/purchase-orders", {
    access: STAFF,
    body: obj({
      supplierId: uuid, notes: z.string().optional(),
      items: z.array(obj({ productId: uuid, quantity: z.coerce.number().int().min(1), unitCost: z.coerce.number().min(0).optional() })).min(1),
    }),
  }, ({ body, user }) => procurement.createPurchaseOrder(user!.id, body));
  r.post("/inventory/purchase-orders/:id/status", { access: STAFF, body: obj({ status: z.enum(["ORDERED", "CANCELLED"]) }) },
    ({ params, body }) => procurement.setPurchaseOrderStatus(params.id, body.status));
  r.post("/inventory/purchase-orders/:id/receive", {
    access: STAFF,
    body: obj({ receiptId: uuid, reference: z.string().optional(), items: z.array(obj({ itemId: uuid, quantity: z.coerce.number().int().min(0) })) }),
  }, ({ params, body, user }) => procurement.receivePurchaseOrder(params.id, user!.id, body));

  // ── stock-takes, restock plan, insights ─────────────────────────────────
  r.get("/inventory/stock-takes", { access: STAFF }, () => procurement.stockTakes());
  r.post("/inventory/stock-takes", { access: STAFF, body: obj({ note: z.string().optional() }) }, ({ body, user }) => procurement.startStockTake(user!.id, body.note));
  r.get("/inventory/stock-takes/:id", { access: STAFF }, ({ params }) => procurement.stockTake(params.id));
  r.patch("/inventory/stock-takes/:id/counts", {
    access: STAFF,
    body: obj({ counts: z.array(obj({ productId: uuid, counted: z.coerce.number().int().min(0).nullable() })) }),
  }, ({ params, body }) => procurement.saveCounts(params.id, body.counts));
  r.post("/inventory/stock-takes/:id/apply", { access: STAFF, body: obj({}) }, ({ params, user }) => procurement.applyStockTake(params.id, user!.id));
  r.post("/inventory/stock-takes/:id/cancel", { access: STAFF, body: obj({}) }, ({ params }) => procurement.cancelStockTake(params.id));
  r.get("/inventory/reorder", { access: STAFF }, () => procurement.reorderSuggestions());
  r.get("/inventory/insights", { access: STAFF }, () => procurement.insights());

  // product-level stock settings (registered after the fixed paths above)
  r.patch("/inventory/:productId/settings", {
    access: STAFF,
    body: obj({ reorderLevel: z.coerce.number().int().min(0).optional(), location: z.string().optional(), costPrice: z.coerce.number().min(0).optional(), allowSupplierSourcing: z.boolean().optional() }),
  }, ({ params, body }) => inventory.updateSettings(params.productId, body));

  // ── returns & refunds ───────────────────────────────────────────────────
  r.get("/returns/eligibility", { access: "optional", limit: { key: "ret-elig", limit: 20, windowMs: 60_000 } },
    ({ query, user }) => returns.eligibility(query.get("orderNumber") ?? "", query.get("phone") ?? undefined, user ?? undefined));
  r.post("/returns", { access: "optional", body: returnRequestSchema, limit: { key: "ret", limit: 10, windowMs: 60_000 } },
    ({ body, user }) => returns.request(body, user ?? undefined));
  r.get("/returns", { access: STAFF }, ({ query }) => returns.list(query.get("status") ?? undefined));
  r.get("/returns/:id", { access: STAFF }, ({ params }) => returns.detail(params.id));
  r.post("/returns/:id/decision", { access: ADMIN, body: obj({ approve: z.boolean(), note: z.string().optional() }) },
    ({ params, body }) => returns.decide(params.id, body.approve, body.note));
  r.post("/returns/:id/inspect", {
    access: STAFF,
    body: obj({ items: z.array(obj({ returnItemId: uuid, receivedQuantity: z.coerce.number().int().min(0), sellableQuantity: z.coerce.number().int().min(0) })) }),
  }, ({ params, body, user }) => returns.inspect(params.id, user!.id, body.items));
  r.post("/returns/:id/refund", { access: ADMIN, body: obj({ amount: z.coerce.number().min(0.01), note: z.string().optional(), reference: z.string().optional() }) },
    ({ params, body, user }) => returns.refund(params.id, user!.id, body.amount, body.note, body.reference));
}
