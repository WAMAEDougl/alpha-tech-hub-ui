import { z } from "zod";

// Request validation. Every object is .strict(): unknown fields are rejected (not silently dropped),
// which is what stops a customer sending their own `unitPrice` or `role`.

const obj = <T extends z.ZodRawShape>(shape: T) => z.object(shape).strict();
const phone = z.string().min(9);

// ── auth & users ───────────────────────────────────────────────────────────
export const loginSchema = obj({ email: z.string().email(), password: z.string().min(1) });
export const registerSchema = obj({ email: z.string().email(), name: z.string().min(1), password: z.string().min(8), phone: z.string().optional() });
export const createStaffSchema = obj({
  email: z.string().email(), name: z.string().min(2), password: z.string().min(8), role: z.enum(["ADMIN", "INVENTORY", "CUSTOMER"]),
});
export type CreateUserDto = z.infer<typeof registerSchema>;
export type CreateStaffDto = z.infer<typeof createStaffSchema>;

// ── products ───────────────────────────────────────────────────────────────
export const createProductSchema = obj({
  name: z.string().min(1), sku: z.string().min(1), brand: z.string().min(1), category: z.string().min(1),
  condition: z.string().optional(),
  price: z.coerce.number().min(0),
  stock: z.coerce.number().int().min(0),
  reorderLevel: z.coerce.number().int().min(0).optional(),
  location: z.string().optional(),
  allowSupplierSourcing: z.boolean().optional(),
  costPrice: z.coerce.number().min(0).optional(),
  summary: z.string().optional(), description: z.string().optional(),
  images: z.array(z.string()).optional(),
  specs: z.array(obj({ label: z.string(), value: z.string() })).optional(),
  rating: z.coerce.number().optional(),
});
export const updateProductSchema = createProductSchema.partial();
export type CreateProductDto = z.infer<typeof createProductSchema>;

// ── orders ─────────────────────────────────────────────────────────────────
export const PaymentMethodDto = { MPESA_MANUAL: "MPESA_MANUAL", MPESA_STK: "MPESA_STK", CASH: "CASH" } as const;

export const orderItemSchema = obj({ productId: z.string().uuid(), quantity: z.coerce.number().int().min(1).max(50) });
export const quoteSchema = obj({
  items: z.array(orderItemSchema).min(1).max(30),
  fulfillmentMode: z.enum(["DELIVERY", "PICKUP"]),
  deliveryZoneId: z.string().uuid().optional(),
  deliveryArea: z.string().optional(),
  discountCode: z.string().optional(),
});
export const createOrderSchema = quoteSchema
  .extend({
    customerName: z.string().min(2),
    customerPhone: phone,
    customerEmail: z.string().email().optional(),
    deliveryAddress: z.string().optional(),
    paymentMethod: z.enum(["MPESA_MANUAL", "MPESA_STK", "CASH"]),
    notes: z.string().optional(),
  })
  .superRefine((o, ctx) => {
    if (o.fulfillmentMode === "DELIVERY" && (o.deliveryAddress ?? "").trim().length < 5) {
      ctx.addIssue({ code: "custom", path: ["deliveryAddress"], message: "Add the street, building or landmark to deliver to" });
    }
  });
export type QuoteDto = z.infer<typeof quoteSchema>;
export type CreateOrderDto = z.infer<typeof createOrderSchema>;

// ── returns ────────────────────────────────────────────────────────────────
export const returnRequestSchema = obj({
  orderNumber: z.string(),
  phone: z.string().optional(),
  items: z.array(obj({ orderItemId: z.string().uuid(), quantity: z.coerce.number().int().min(1) })),
  reason: z.string().min(3),
  requestRef: z.string().uuid().optional(),
  resolution: z.enum(["REFUND", "EXCHANGE"]).optional(),
});
export type RequestDto = z.infer<typeof returnRequestSchema>;

// ── repairs ────────────────────────────────────────────────────────────────
export const createRepairSchema = obj({
  customerName: z.string(), customerPhone: z.string(), customerEmail: z.string().email().optional(),
  deviceBrand: z.string(), deviceModel: z.string().optional(), issueDescription: z.string(), serviceType: z.string().optional(),
});
export const updateRepairSchema = obj({
  status: z.string().optional(), technician: z.string().optional(), technicianNotes: z.string().optional(),
  estimatedCost: z.coerce.number().optional(), finalCost: z.coerce.number().optional(),
});
export type CreateRepairDto = z.infer<typeof createRepairSchema>;
export type UpdateRepairDto = z.infer<typeof updateRepairSchema>;
