import type { InvoiceSnapshot } from "./orderTypes";

const esc = (s: unknown) =>
  String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c] as string));
const kes = (n: number) => `KES ${Math.round(n).toLocaleString("en-KE")}`;

/** Open a clean, printable invoice. Everything is escaped: customer text can never inject markup. */
export function printInvoice(number: string, issuedAt: string, s: InvoiceSnapshot) {
  const w = window.open("", "_blank", "width=820,height=900");
  if (!w) return false;
  const rows = s.lines.map(l => `<tr><td>${esc(l.name)}${l.sku ? `<br><small>${esc(l.sku)}</small>` : ""}</td><td class="r">${l.quantity}</td><td class="r">${kes(l.unitPrice)}</td><td class="r">${kes(l.total)}</td></tr>`).join("");
  w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>${esc(number)}</title><style>
    body{font-family:Arial,Helvetica,sans-serif;color:#111;margin:32px;font-size:13px}
    h1{font-size:22px;margin:0 0 4px} small{color:#666}
    .row{display:flex;justify-content:space-between;gap:24px;margin-bottom:20px}
    table{width:100%;border-collapse:collapse;margin-top:12px}
    th,td{border-bottom:1px solid #ddd;padding:8px 6px;text-align:left} th{background:#f5f5f5}
    .r{text-align:right} .tot td{border:0;padding:3px 6px} .grand td{font-weight:bold;font-size:15px;border-top:2px solid #111}
    .paid{display:inline-block;border:2px solid #0a7a3d;color:#0a7a3d;padding:2px 10px;font-weight:bold;transform:rotate(-4deg)}
  </style></head><body>
    <div class="row"><div><h1>${esc(s.seller.name)}</h1><small>${esc(s.seller.address ?? "")}<br>${esc(s.seller.email ?? "")} ${esc(s.seller.phone ?? "")}</small></div>
    <div style="text-align:right"><h1>INVOICE</h1><b>${esc(number)}</b><br><small>Issued ${esc(new Date(issuedAt).toLocaleDateString("en-KE"))}<br>Order ${esc(s.orderNumber)}</small></div></div>
    <div class="row"><div><small>Bill to</small><br><b>${esc(s.customer.name)}</b><br>${esc(s.customer.phone)}<br>${esc(s.customer.email ?? "")}<br>${esc(s.customer.address ?? (s.fulfillmentMode === "PICKUP" ? "In-store pickup" : ""))}</div>
    <div style="text-align:right"><small>Payment</small><br>${s.paymentStatus === "PAID" ? '<span class="paid">PAID</span>' : esc(s.paymentMethod === "CASH" ? "Cash on delivery / pickup" : "M-Pesa")}${s.mpesaReceipt ? `<br><small>M-Pesa ${esc(s.mpesaReceipt)}</small>` : ""}</div></div>
    <table><thead><tr><th>Item</th><th class="r">Qty</th><th class="r">Unit price</th><th class="r">Total</th></tr></thead><tbody>${rows}</tbody></table>
    <table class="tot" style="width:50%;margin-left:auto"><tr><td>Subtotal</td><td class="r">${kes(s.subtotal)}</td></tr>
    <tr><td>Delivery</td><td class="r">${kes(s.deliveryFee)}</td></tr>
    ${s.discount ? `<tr><td>Discount</td><td class="r">-${kes(s.discount)}</td></tr>` : ""}
    <tr class="grand"><td>Total</td><td class="r">${kes(s.total)}</td></tr></table>
    <p style="margin-top:32px"><small>Thank you for shopping with ${esc(s.seller.name)}.</small></p>
    <script>window.onload=function(){window.print()}</script></body></html>`);
  w.document.close();
  return true;
}
