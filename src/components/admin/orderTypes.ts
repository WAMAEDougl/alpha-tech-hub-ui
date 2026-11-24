import type { Role } from "@/contexts/AuthContext";

export type Lifecycle = "AWAITING_PAYMENT" | "AWAITING_VERIFICATION" | "PAID" | "PAY_ON_DELIVERY" | "FULFILLING" | "COMPLETED" | "CANCELLED" | "STALE";
export type Stage = "OFFICE_REVIEW" | "SOURCING" | "READY_TO_PACK" | "PACKING" | "PACKED" | "READY_PICKUP" | "DISPATCHED" | "DELIVERED" | "CANCELLED" | "AWAITING_RETURN";
export type PaymentMethod = "MPESA_MANUAL" | "MPESA_STK" | "CASH";

export interface OrderRow {
  id: string;
  orderNumber: string;
  createdAt: string;
  updatedAt: string;
  customerName: string;
  customerPhone: string;
  customerEmail: string | null;
  lifecycleStatus: Lifecycle;
  paymentStatus: "PENDING" | "AWAITING_VERIFICATION" | "PAID" | "ON_DELIVERY" | "FAILED";
  workflowStage: Stage;
  paymentMethod: PaymentMethod;
  fulfillmentMode: "DELIVERY" | "PICKUP";
  totalAmount: number;
  deliveryFee: number;
  deliveryResolved: boolean;
  itemCount: number;
  items: { name: string; quantity: number }[];
  inventoryIssue: string | null;
  paymentReference: string | null;
  journeyStage: string;
}

export interface OrderLine {
  id: string; productId: string; name: string; sku: string; location: string | null;
  quantity: number; unitPrice: number;
  reserved: number; picked: number; deducted: number; packChecked: boolean;
  shelfStock: number; available: number; canSourceFromSupplier: boolean;
  planSupplierId: string | null; planExpectedDate: string | null; planNote: string | null;
}

export interface OrderDetail extends Omit<OrderRow, "items"> {
  items: OrderLine[];
  deliveryAddress: string | null; notes: string | null; deliveryZone: string | null; deliveryZoneId: string | null;
  subtotal: number; discountAmount: number; discountCode: string | null;
  mpesaReceiptNumber: string | null; paymentReferenceAt: string | null; paidAt: string | null;
  reviewedAt: string | null; riderName: string | null; riderPhone: string | null; dispatchedAt: string | null; deliveredAt: string | null;
  cancelReason: string | null; deliveryFailureReason: string | null; stockSettledAt: string | null;
  invoice: { invoiceNumber: string; issuedAt: string; snapshot: InvoiceSnapshot } | null;
  events: { lifecycleStatus: Lifecycle; workflowStage: Stage; note: string | null; by: string; at: string }[];
  returns: { id: string; status: string; kind: string; createdAt: string; refundAmount: number | null }[];
  refundedAmount: number;
  notifications: { channel: "EMAIL" | "WHATSAPP"; milestone: string; status: "PENDING" | "SENT" | "FAILED" | "SKIPPED"; error: string | null; at: string }[];
}

export interface InvoiceSnapshot {
  seller: { name: string; address: string | null; email: string | null; phone: string | null };
  customer: { name: string; phone: string; email: string | null; address: string | null };
  orderNumber: string; fulfillmentMode: string; paymentMethod: string; paymentStatus: string; mpesaReceipt: string | null;
  lines: { name: string; sku: string | null; quantity: number; unitPrice: number; total: number }[];
  subtotal: number; deliveryFee: number; discount: number; total: number;
}

// ── labels ───────────────────────────────────────────────────────────────

export const lifecycleLabel: Record<Lifecycle, string> = {
  AWAITING_PAYMENT: "Awaiting payment",
  AWAITING_VERIFICATION: "Verify payment",
  PAID: "Paid",
  PAY_ON_DELIVERY: "Pay on delivery",
  FULFILLING: "Fulfilling",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
  STALE: "Expired",
};

export const stageLabel: Record<Stage, string> = {
  OFFICE_REVIEW: "Office review",
  SOURCING: "Sourcing & picking",
  READY_TO_PACK: "Ready to pack",
  PACKING: "Packing",
  PACKED: "Packed",
  READY_PICKUP: "Ready for pickup",
  DISPATCHED: "With rider",
  DELIVERED: "Delivered",
  CANCELLED: "Cancelled",
  AWAITING_RETURN: "Awaiting return",
};

const chip = {
  grey: "bg-muted text-muted-foreground",
  amber: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
  blue: "bg-sky-500/15 text-sky-600 dark:text-sky-400",
  violet: "bg-violet-500/15 text-violet-600 dark:text-violet-400",
  green: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
  red: "bg-destructive/15 text-destructive",
};

/** One badge that says where the order is right now. */
export function statusBadge(o: Pick<OrderRow, "lifecycleStatus" | "workflowStage">): { label: string; className: string } {
  const { lifecycleStatus: l, workflowStage: s } = o;
  if (l === "CANCELLED" || l === "STALE") return { label: s === "AWAITING_RETURN" ? "Awaiting return" : lifecycleLabel[l], className: chip.red };
  if (l === "COMPLETED") return { label: "Completed", className: chip.green };
  if (l === "AWAITING_VERIFICATION") return { label: "Verify payment", className: chip.amber };
  if (l === "AWAITING_PAYMENT") return { label: "Awaiting payment", className: chip.grey };
  if (s === "OFFICE_REVIEW") return { label: "Needs review", className: chip.blue };
  if (s === "DISPATCHED" || s === "READY_PICKUP") return { label: stageLabel[s], className: chip.violet };
  return { label: stageLabel[s], className: chip.amber };
}

export const paymentLabel = (m: string) =>
  m === "MPESA_MANUAL" ? "M-Pesa (paybill/till)" : m === "MPESA_STK" ? "M-Pesa prompt" : m === "CASH" ? "Cash" : m;

export const fmtDate = (iso: string) =>
  new Date(iso).toLocaleString("en-KE", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

export const ago = (iso: string) => {
  const m = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m} min ago`;
  const h = Math.floor(m / 60);
  return h < 24 ? `${h} h ago` : `${Math.floor(h / 24)} d ago`;
};

/** Open the customer's chat on WhatsApp. */
export const whatsappLink = (phone: string, text: string) =>
  `https://wa.me/${phone.replace(/\D/g, "")}?text=${encodeURIComponent(text)}`;

// ── what happens next, and who does it ───────────────────────────────────

export interface NextStep {
  /** short instruction shown on the workspace */
  title: string;
  detail: string;
  /** who must do it */
  owner: "OFFICE" | "INVENTORY" | "CUSTOMER" | "NONE";
}

export function nextStep(o: OrderDetail): NextStep {
  const pickup = o.fulfillmentMode === "PICKUP";
  if (o.lifecycleStatus === "CANCELLED" || o.lifecycleStatus === "STALE") {
    return o.workflowStage === "AWAITING_RETURN"
      ? { title: "Receive the returned goods", detail: "Inventory inspects what the rider brings back and puts sellable items on the shelf.", owner: "INVENTORY" }
      : { title: "Closed", detail: o.cancelReason ?? "This order is closed.", owner: "NONE" };
  }
  if (o.lifecycleStatus === "COMPLETED") return { title: "Completed", detail: pickup ? "Collected by the customer." : "Delivered to the customer.", owner: "NONE" };
  if (o.inventoryIssue) return { title: "Office decision needed", detail: o.inventoryIssue, owner: "OFFICE" };
  if (o.lifecycleStatus === "AWAITING_PAYMENT") return { title: "Waiting for the customer to pay", detail: "Nothing is reserved yet. If they have paid, enter their M-Pesa code to confirm.", owner: "CUSTOMER" };
  if (o.lifecycleStatus === "AWAITING_VERIFICATION") return { title: "Verify the M-Pesa payment", detail: `Check code ${o.paymentReference ?? ""} and the amount against your M-Pesa statement.`, owner: "OFFICE" };
  switch (o.workflowStage) {
    case "OFFICE_REVIEW":
      return !o.deliveryResolved && !pickup
        ? { title: "Set the delivery fee", detail: "This address is outside every delivery zone. Agree a fee with the customer first.", owner: "OFFICE" }
        : { title: "Confirm, issue invoice & send to inventory", detail: "Checks the order, issues the invoice and reserves the stock.", owner: "OFFICE" };
    case "SOURCING": return { title: "Pick or receive every item", detail: "Pick from the shelf, or receive from a supplier for any shortfall.", owner: "INVENTORY" };
    case "READY_TO_PACK": return { title: "Start packing", detail: "Everything is picked.", owner: "INVENTORY" };
    case "PACKING": return { title: "Check each item, then mark packed", detail: "Tick every line once it is in the box.", owner: "INVENTORY" };
    case "PACKED": return pickup
      ? { title: "Mark ready for collection", detail: "Stock stays reserved until the customer collects.", owner: "INVENTORY" }
      : { title: "Hand over to the rider", detail: "Enter the rider's name and phone. Stock leaves the shop now.", owner: "INVENTORY" };
    case "READY_PICKUP": return { title: "Confirm collection", detail: o.paymentMethod === "CASH" && o.paymentStatus !== "PAID" ? "Collect the full payment, then confirm." : "Confirm once the customer has collected.", owner: "OFFICE" };
    case "DISPATCHED": return { title: "Confirm delivery", detail: o.paymentMethod === "CASH" && o.paymentStatus !== "PAID" ? "Confirm the rider collected the full cash payment, or record a failed delivery." : "Confirm delivery, or record a failed delivery.", owner: "OFFICE" };
    default: return { title: "", detail: "", owner: "NONE" };
  }
}

export const ownerLabel = (o: NextStep["owner"]) =>
  o === "OFFICE" ? "Office" : o === "INVENTORY" ? "Inventory" : o === "CUSTOMER" ? "Customer" : "";

/** Can this person do the next step? (the server enforces the same split) */
export const canAct = (owner: NextStep["owner"], role?: Role) =>
  owner === "OFFICE" ? role === "ADMIN" : owner === "INVENTORY" ? role === "ADMIN" || role === "INVENTORY" : false;

/** Progress bar steps for the order workspace. */
export function progressSteps(o: Pick<OrderDetail, "fulfillmentMode">) {
  return [
    { key: "pay", label: "Paid" },
    { key: "review", label: "Approved" },
    { key: "pick", label: "Picked" },
    { key: "pack", label: "Packed" },
    { key: "hand", label: o.fulfillmentMode === "PICKUP" ? "Ready" : "With rider" },
    { key: "done", label: o.fulfillmentMode === "PICKUP" ? "Collected" : "Delivered" },
  ];
}

export function progressIndex(o: OrderDetail): number {
  if (o.lifecycleStatus === "COMPLETED") return 6;
  switch (o.workflowStage) {
    case "OFFICE_REVIEW": return o.lifecycleStatus === "PAID" || o.lifecycleStatus === "PAY_ON_DELIVERY" ? 1 : 0;
    case "SOURCING": return 2;
    case "READY_TO_PACK": return 3;
    case "PACKING": return 3;
    case "PACKED": return 4;
    case "READY_PICKUP":
    case "DISPATCHED": return 5;
    default: return 0;
  }
}
