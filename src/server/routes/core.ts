import { z } from "zod";
import { ADMIN, STAFF, type Router } from "../router";
import { BadRequestException, NotFoundException } from "../http";
import { prisma } from "../prisma";
import { authService, products, settings, users } from "../container";
import { createProductSchema, createStaffSchema, loginSchema, registerSchema, updateProductSchema } from "../dto";
import { saveImage } from "../storage";

const obj = <T extends z.ZodRawShape>(s: T) => z.object(s).strict();
const cleanAreas = (a?: string[]) => (a ?? []).map(x => x.trim().toLowerCase()).filter(Boolean);
const zoneView = (z: { fee: unknown } & Record<string, unknown>) => ({ ...z, fee: Number(z.fee) });
const discountView = (d: { value: unknown; minSubtotal: unknown } & Record<string, unknown>) => ({
  ...d, value: Number(d.value), minSubtotal: d.minSubtotal === null ? null : Number(d.minSubtotal),
});

const settingsSchema = obj({
  companyName: z.string(), logoUrl: z.string(), contactEmail: z.string().email(), whatsappNumber: z.string(),
  locationLat: z.number(), locationLng: z.number(), address: z.string(),
  mpesaManualEnabled: z.boolean(), paybillNumber: z.string(), tillNumber: z.string(), mpesaStkEnabled: z.boolean(),
  codEnabled: z.boolean(), returnWindowDays: z.number().int().min(0).max(30),
}).partial();

export function registerCore(r: Router) {
  // ── auth ────────────────────────────────────────────────────────────────
  r.post("/auth/register", { body: registerSchema, limit: { key: "register", limit: 5, windowMs: 60_000 } }, ({ body }) => authService.register(body));
  r.post("/auth/login", { body: loginSchema, limit: { key: "login", limit: 8, windowMs: 60_000 } }, ({ body }) => authService.login(body));
  r.get("/auth/me", { access: "user" }, ({ user }) => user);

  // ── staff accounts (admin only) ─────────────────────────────────────────
  r.get("/users", { access: ADMIN }, () => users.findAll());
  r.post("/users/staff", { access: ADMIN, body: createStaffSchema }, ({ body }) => users.createStaff(body));
  r.patch("/users/:id/active", { access: ADMIN, body: obj({ isActive: z.boolean() }) }, ({ params, body, user }) => users.setActive(params.id, body.isActive, user!.id));
  r.patch("/users/:id/password", { access: ADMIN, body: obj({ password: z.string().min(8) }) }, ({ params, body }) => users.resetPassword(params.id, body.password));
  r.patch("/users/:id/role", { access: ADMIN, body: obj({ role: z.enum(["ADMIN", "INVENTORY", "CUSTOMER"]) }) }, ({ params, body, user }) => users.setRole(params.id, body.role as never, user!.id));

  // ── products ────────────────────────────────────────────────────────────
  r.get("/products", {}, ({ query }) => products.findAll({ category: query.get("category") ?? undefined, search: query.get("search") ?? undefined }));
  r.get("/products/manage", { access: STAFF }, () => products.findAll({}, true));
  r.get("/products/:id", {}, ({ params }) => products.findOne(params.id));
  r.post("/products", { access: STAFF, body: createProductSchema }, ({ body, user }) => products.create(body, user!.id));
  r.patch("/products/:id", { access: STAFF, body: updateProductSchema }, ({ params, body }) => products.update(params.id, body));
  r.delete("/products/:id", { access: ADMIN }, ({ params }) => products.remove(params.id));

  // ── shop settings ───────────────────────────────────────────────────────
  r.get("/settings", {}, () => settings.get());
  r.patch("/settings", { access: ADMIN, body: settingsSchema }, ({ body }) => settings.update(body));

  // ── image upload ────────────────────────────────────────────────────────
  r.post("/upload/images", { access: STAFF }, async ({ req }) => {
    const files = (await req.formData()).getAll("files").filter((f): f is File => f instanceof File);
    if (!files.length) throw new BadRequestException("No files uploaded");
    if (files.length > 10) throw new BadRequestException("Upload at most 10 images at a time");
    return Promise.all(files.map(saveImage));
  });
  r.post("/upload/image", { access: STAFF }, async ({ req }) => {
    const f = (await req.formData()).get("file");
    if (!(f instanceof File)) throw new BadRequestException("No file uploaded");
    return saveImage(f);
  });

  // ── delivery zones ──────────────────────────────────────────────────────
  const zoneBody = obj({
    name: z.string().min(2), fee: z.coerce.number().min(0), areas: z.array(z.string()).optional(), estimatedDays: z.string().optional(),
    isActive: z.boolean().optional(), sortOrder: z.coerce.number().int().optional(),
  });
  r.get("/zones", {}, async () => {
    const rows = await prisma.deliveryZone.findMany({ where: { isActive: true }, orderBy: [{ sortOrder: "asc" }, { name: "asc" }] });
    return rows.map(z => ({ id: z.id, name: z.name, fee: Number(z.fee), estimatedDays: z.estimatedDays, areas: z.areas }));
  });
  r.get("/zones/all", { access: STAFF }, async () => (await prisma.deliveryZone.findMany({ orderBy: [{ sortOrder: "asc" }, { name: "asc" }] })).map(zoneView));
  r.post("/zones", { access: ADMIN, body: zoneBody }, async ({ body }) =>
    zoneView(await prisma.deliveryZone.create({
      data: { name: body.name.trim(), fee: body.fee, areas: cleanAreas(body.areas), estimatedDays: body.estimatedDays?.trim() || null, isActive: body.isActive ?? true, sortOrder: body.sortOrder ?? 0 },
    })));
  r.patch("/zones/:id", { access: ADMIN, body: zoneBody.partial() }, async ({ params, body }) => {
    try {
      return zoneView(await prisma.deliveryZone.update({ where: { id: params.id }, data: { ...body, ...(body.areas ? { areas: cleanAreas(body.areas) } : {}) } }));
    } catch { throw new NotFoundException("Zone not found"); }
  });
  // a zone that past orders point to is switched off, never deleted, so history stays intact
  r.delete("/zones/:id", { access: ADMIN }, async ({ params }) => {
    if (await prisma.order.count({ where: { deliveryZoneId: params.id } })) {
      await prisma.deliveryZone.update({ where: { id: params.id }, data: { isActive: false } });
      return { deactivated: true };
    }
    await prisma.deliveryZone.delete({ where: { id: params.id } }).catch(() => { throw new NotFoundException("Zone not found"); });
    return { deleted: true };
  });

  // ── discount codes ──────────────────────────────────────────────────────
  const discountBody = obj({
    code: z.string().regex(/^[A-Za-z0-9_-]{3,30}$/, "Code must be 3-30 letters, numbers, - or _"),
    type: z.enum(["PERCENT", "FIXED", "FREE_DELIVERY"]),
    value: z.coerce.number().min(0),
    minSubtotal: z.coerce.number().min(0).optional(),
    maxUses: z.coerce.number().int().min(1).optional(),
    expiresAt: z.string().datetime().optional(),
    isActive: z.boolean().optional(),
  });
  r.get("/discounts", { access: ADMIN }, async () => (await prisma.discountCode.findMany({ orderBy: { createdAt: "desc" } })).map(discountView));
  r.post("/discounts", { access: ADMIN, body: discountBody }, async ({ body }) => {
    if (body.type === "PERCENT" && body.value > 100) throw new BadRequestException("A percentage discount cannot be more than 100.");
    return discountView(await prisma.discountCode.create({
      data: {
        code: body.code.trim().toUpperCase(), type: body.type, value: body.type === "FREE_DELIVERY" ? 0 : body.value,
        minSubtotal: body.minSubtotal ?? null, maxUses: body.maxUses ?? null,
        expiresAt: body.expiresAt ? new Date(body.expiresAt) : null, isActive: body.isActive ?? true,
      },
    }));
  });
  r.patch("/discounts/:id", { access: ADMIN, body: discountBody.omit({ code: true }).partial() }, async ({ params, body }) => {
    try {
      return discountView(await prisma.discountCode.update({ where: { id: params.id }, data: { ...body, ...(body.expiresAt ? { expiresAt: new Date(body.expiresAt) } : {}) } }));
    } catch { throw new NotFoundException("Code not found"); }
  });
  r.delete("/discounts/:id", { access: ADMIN }, async ({ params }) => {
    if (await prisma.order.count({ where: { discountCodeId: params.id } })) {
      await prisma.discountCode.update({ where: { id: params.id }, data: { isActive: false } });
      return { deactivated: true };
    }
    await prisma.discountCode.delete({ where: { id: params.id } }).catch(() => { throw new NotFoundException("Code not found"); });
    return { deleted: true };
  });
}
