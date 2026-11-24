import { useState } from "react";
import { Link, useParams } from "@/lib/router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, ArrowLeft, Check, FileText, Loader2, MapPin, MessageCircle, Phone, Store } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { api, money } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { printInvoice } from "./invoicePrint";
import {
  canAct, fmtDate, nextStep, ownerLabel, paymentLabel, progressIndex, progressSteps, statusBadge, whatsappLink,
  type OrderDetail, type OrderLine,
} from "./orderTypes";

interface Supplier { id: string; name: string; isActive: boolean }
interface Zone { id: string; name: string; fee: number; isActive: boolean }

type Dialogs =
  | { kind: "none" }
  | { kind: "receive"; line: OrderLine }
  | { kind: "plan"; line: OrderLine }
  | { kind: "dispatch" }
  | { kind: "text"; title: string; label: string; cta: string; path: string; field: string; destructive?: boolean; hint?: string }
  | { kind: "invoice" };

const select = "h-10 w-full rounded-md border border-input bg-background px-3 text-sm";

export default function OrderWorkspace() {
  const { orderId = "" } = useParams();
  const { user } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [dlg, setDlg] = useState<Dialogs>({ kind: "none" });
  const [verifyCode, setVerifyCode] = useState("");
  const [collect, setCollect] = useState(false);
  const [pickQty, setPickQty] = useState<Record<string, string>>({});

  const { data: o, isLoading, error } = useQuery({
    queryKey: ["order", orderId],
    queryFn: () => api<OrderDetail>(`/orders/${orderId}`),
    refetchInterval: 20_000,
  });

  const act = useMutation({
    mutationFn: (v: { path: string; body?: Record<string, unknown> }) =>
      api<OrderDetail>(`/orders/${v.path}`, { method: "POST", body: { ...v.body, expectedUpdatedAt: o?.updatedAt } }),
    onSuccess: res => {
      qc.setQueryData(["order", orderId], res);
      qc.invalidateQueries({ queryKey: ["orders"] });
      qc.invalidateQueries({ queryKey: ["inventory"] });
      setDlg({ kind: "none" });
    },
    onError: (e: Error) => toast({ title: "That didn't go through", description: e.message, variant: "destructive" }),
  });
  const run = (path: string, body?: Record<string, unknown>) => act.mutate({ path, body });

  if (isLoading) return <Loader2 className="h-5 w-5 animate-spin mx-auto my-16 text-muted-foreground" />;
  if (error || !o) return <p className="text-sm text-destructive py-8">{(error as Error)?.message ?? "Order not found"}</p>;

  const role = user?.role;
  const office = role === "ADMIN";
  const step = nextStep(o);
  const mine = canAct(step.owner, role);
  const badge = statusBadge(o);
  const pickup = o.fulfillmentMode === "PICKUP";
  const stage = o.workflowStage;
  const idx = progressIndex(o);
  const closed = ["CANCELLED", "STALE", "COMPLETED"].includes(o.lifecycleStatus);
  const warehouseOpen = !closed && ["SOURCING", "READY_TO_PACK", "PACKING", "PACKED"].includes(stage);
  const cashDue = o.paymentMethod === "CASH" && o.paymentStatus !== "PAID";
  const busy = act.isPending;

  const lineRemaining = (l: OrderLine) => l.quantity - l.picked;

  return (
    <div className="space-y-5 max-w-6xl">
      <Link to="/admin/orders" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" /> All orders</Link>

      {/* header */}
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-heading font-bold font-mono">{o.orderNumber}</h1>
        <span className={`text-xs px-2 py-0.5 rounded-full ${badge.className}`}>{badge.label}</span>
        <span className="text-sm text-muted-foreground">{fmtDate(o.createdAt)} · {pickup ? "Pickup" : "Delivery"} · {paymentLabel(o.paymentMethod)}</span>
        {o.invoice && (
          <Button size="sm" variant="outline" className="ml-auto" onClick={() => setDlg({ kind: "invoice" })}>
            <FileText className="h-4 w-4" /> Invoice {o.invoice.invoiceNumber}
          </Button>
        )}
      </div>

      {/* progress */}
      {!closed && (
        <ol className="flex items-center gap-1 text-xs overflow-x-auto pb-1">
          {progressSteps(o).map((s, i) => (
            <li key={s.key} className="flex items-center gap-1 shrink-0">
              <span className={`flex items-center gap-1.5 rounded-full px-3 py-1 ${i < idx ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400" : i === idx ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
                {i < idx && <Check className="h-3 w-3" />}{s.label}
              </span>
              {i < 5 && <span className="w-4 h-px bg-border" />}
            </li>
          ))}
        </ol>
      )}

      {/* next step */}
      <Card className={o.inventoryIssue ? "border-amber-500/60" : step.owner === "NONE" ? "" : "border-primary/40"}>
        <CardContent className="p-5 space-y-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">{step.owner === "NONE" ? "Status" : `Next step · ${ownerLabel(step.owner)}`}</p>
              <h2 className="text-lg font-heading font-semibold flex items-center gap-2">
                {o.inventoryIssue && <AlertTriangle className="h-5 w-5 text-amber-500" />}{step.title}
              </h2>
              <p className="text-sm text-muted-foreground">{step.detail}</p>
            </div>
            {!mine && step.owner !== "NONE" && step.owner !== "CUSTOMER" && (
              <Badge variant="outline">Waiting for {ownerLabel(step.owner).toLowerCase()}</Badge>
            )}
          </div>

          <div className="flex flex-wrap items-end gap-3">
            {/* office: payment */}
            {office && (o.lifecycleStatus === "AWAITING_VERIFICATION" || o.lifecycleStatus === "AWAITING_PAYMENT") && o.paymentMethod !== "CASH" && (
              <>
                <div className="space-y-1.5">
                  <Label>M-Pesa code {o.paymentReference ? "(from customer)" : "(from your statement)"}</Label>
                  <Input className="w-56 font-mono uppercase" value={verifyCode || o.paymentReference || ""} onChange={e => setVerifyCode(e.target.value.toUpperCase())} placeholder="e.g. SGH7K2L9QX" />
                </div>
                <Button disabled={busy} onClick={() => run(`${o.id}/verify-payment`, { code: verifyCode || o.paymentReference || undefined })}>Confirm payment received</Button>
                {o.lifecycleStatus === "AWAITING_VERIFICATION" && (
                  <Button variant="outline" disabled={busy} onClick={() => setDlg({ kind: "text", title: "Reject this payment code", label: "Why isn't it accepted?", cta: "Reject code", path: `${o.id}/reject-payment`, field: "note", hint: "The customer can submit another code." })}>Reject code</Button>
                )}
              </>
            )}

            {/* office: delivery fee */}
            {office && stage === "OFFICE_REVIEW" && !o.deliveryResolved && !pickup && !closed && <DeliveryFixer o={o} busy={busy} run={run} />}

            {/* office: approve */}
            {office && stage === "OFFICE_REVIEW" && ["PAID", "PAY_ON_DELIVERY"].includes(o.lifecycleStatus) && (o.deliveryResolved || pickup) && (
              <Button disabled={busy} onClick={() => run(`${o.id}/approve`)}>{busy && <Loader2 className="h-4 w-4 animate-spin" />} Confirm, issue invoice &amp; send to inventory</Button>
            )}

            {/* inventory: packing & handover */}
            {!o.inventoryIssue && role && (stage === "READY_TO_PACK") && <Button disabled={busy} onClick={() => run(`${o.id}/start-packing`)}>Start packing</Button>}
            {!o.inventoryIssue && role && stage === "PACKING" && <Button disabled={busy || o.items.some(i => !i.packChecked)} onClick={() => run(`${o.id}/mark-packed`)}>Mark as packed</Button>}
            {!o.inventoryIssue && role && stage === "PACKED" && (pickup
              ? <Button disabled={busy} onClick={() => run(`${o.id}/ready-pickup`)}>Mark ready for collection</Button>
              : <Button disabled={busy} onClick={() => setDlg({ kind: "dispatch" })}>Hand over to rider</Button>)}

            {/* office: completion */}
            {office && (stage === "DISPATCHED" || stage === "READY_PICKUP") && (
              <>
                {cashDue && (
                  <label className="flex items-center gap-2 text-sm"><Checkbox checked={collect} onCheckedChange={c => setCollect(!!c)} /> Full payment of {money(o.totalAmount)} was collected</label>
                )}
                <Button disabled={busy || (cashDue && !collect)} onClick={() => run(`${o.id}/complete`, { collectPayment: collect })}>{pickup ? "Confirm collected" : "Confirm delivered"}</Button>
                {stage === "DISPATCHED" && (
                  <Button variant="outline" className="text-destructive" disabled={busy} onClick={() => setDlg({ kind: "text", title: "Delivery failed", label: "What happened?", cta: "Record failed delivery", path: `${o.id}/failed-delivery`, field: "note", destructive: true, hint: "Customer unreachable, refused, wrong address… The goods return to the shop and a return is opened. Nothing is restocked until inventory inspects them." })}>Delivery failed</Button>
                )}
              </>
            )}

            {/* office: resolve issue */}
            {office && o.inventoryIssue && (
              <Button disabled={busy} onClick={() => setDlg({ kind: "text", title: "Record your decision", label: "What should inventory do?", cta: "Resume fulfilment", path: `${o.id}/resolve-issue`, field: "decision" })}>Record decision &amp; resume</Button>
            )}

            {/* inventory: report issue */}
            {warehouseOpen && !o.inventoryIssue && (
              <Button variant="ghost" size="sm" onClick={() => setDlg({ kind: "text", title: "Report a problem", label: "What does the office need to decide?", cta: "Send to office", path: `${o.id}/issue`, field: "text", hint: "Fulfilment stops until the office records a decision." })}>
                <AlertTriangle className="h-4 w-4" /> Report a problem
              </Button>
            )}

            {/* office: cancel */}
            {office && !closed && stage !== "DISPATCHED" && (
              <Button variant="ghost" size="sm" className="text-destructive ml-auto" onClick={() => setDlg({ kind: "text", title: "Cancel this order", label: "Reason for cancelling", cta: "Cancel order", path: `${o.id}/cancel`, field: "note", destructive: true, hint: "Reserved stock goes back on the shelf. Goods already received from a supplier stay in stock." })}>Cancel order</Button>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="grid lg:grid-cols-3 gap-5 items-start">
        <div className="lg:col-span-2 space-y-5">
          {/* items */}
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-base">Items</CardTitle></CardHeader>
            <CardContent className="p-0 divide-y">
              {o.items.map(l => (
                <div key={l.id} className="p-4 space-y-2">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="font-medium">{l.quantity} × {l.name}</p>
                      <p className="text-xs text-muted-foreground">{l.sku}{l.location ? ` · Shelf ${l.location}` : " · no shelf set"} · {money(l.unitPrice)} each</p>
                    </div>
                    <div className="text-right text-xs space-y-0.5">
                      <p><span className="text-muted-foreground">Picked</span> <b>{l.picked}/{l.quantity}</b></p>
                      {!closed && stage !== "OFFICE_REVIEW" && <p className="text-muted-foreground">Reserved {l.reserved} · {l.available} free on shelf</p>}
                      {l.deducted > 0 && <p className="text-muted-foreground">{l.deducted} left the shop</p>}
                    </div>
                  </div>

                  {stage === "SOURCING" && !closed && lineRemaining(l) > 0 && (
                    <div className="flex flex-wrap items-end gap-2 rounded-md bg-muted/50 p-3">
                      <div className="space-y-1">
                        <Label className="text-xs">Quantity</Label>
                        <Input type="number" min={1} max={lineRemaining(l)} className="w-20 h-9" value={pickQty[l.id] ?? String(lineRemaining(l))} onChange={e => setPickQty(p => ({ ...p, [l.id]: e.target.value }))} />
                      </div>
                      <Button size="sm" disabled={busy} onClick={() => run(`items/${l.id}/source`, { source: "warehouse", quantity: Number(pickQty[l.id] ?? lineRemaining(l)) })}>Pick from shelf</Button>
                      <Button size="sm" variant="outline" disabled={busy} onClick={() => setDlg({ kind: "receive", line: l })}>Receive from supplier</Button>
                      <Button size="sm" variant="ghost" disabled={busy} onClick={() => setDlg({ kind: "plan", line: l })}>Sourcing plan</Button>
                      {l.available < lineRemaining(l) && l.reserved - l.picked < lineRemaining(l) && (
                        <span className="text-xs text-amber-600 dark:text-amber-400">Only {Math.max(0, l.reserved - l.picked) + l.available} on the shelf for this order.{l.canSourceFromSupplier ? " Get the rest from a supplier." : ""}</span>
                      )}
                    </div>
                  )}
                  {l.planNote || l.planExpectedDate ? (
                    <p className="text-xs text-muted-foreground">Plan: {l.planNote}{l.planExpectedDate ? ` · expected ${new Date(l.planExpectedDate).toLocaleDateString("en-KE")}` : ""}</p>
                  ) : null}

                  {stage === "PACKING" && !closed && (
                    <label className="flex items-center gap-2 text-sm cursor-pointer">
                      <Checkbox checked={l.packChecked} disabled={busy || !!o.inventoryIssue} onCheckedChange={c => run(`items/${l.id}/check`, { checked: !!c })} />
                      Checked {l.quantity} × {l.name} is in the box
                    </label>
                  )}
                </div>
              ))}
              <div className="p-4 text-sm space-y-1">
                <Row k="Subtotal" v={money(o.subtotal)} />
                <Row k={`Delivery${o.deliveryZone ? ` (${o.deliveryZone})` : ""}`} v={o.deliveryResolved || pickup ? money(o.deliveryFee) : "to be agreed"} />
                {o.discountAmount > 0 && <Row k={`Discount${o.discountCode ? ` (${o.discountCode})` : ""}`} v={`-${money(o.discountAmount)}`} />}
                <div className="flex justify-between font-semibold pt-1 border-t"><span>Total</span><span>{money(o.totalAmount)}</span></div>
              </div>
            </CardContent>
          </Card>

          {/* history */}
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-base">History</CardTitle></CardHeader>
            <CardContent>
              <ol className="space-y-2 text-sm">
                {[...o.events].reverse().map((e, i) => (
                  <li key={i} className="flex gap-3">
                    <span className="text-xs text-muted-foreground w-28 shrink-0 pt-0.5">{fmtDate(e.at)}</span>
                    <span>{e.note ?? "Updated"} <span className="text-xs text-muted-foreground">· {e.by}</span></span>
                  </li>
                ))}
              </ol>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-5">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-base">Customer</CardTitle></CardHeader>
            <CardContent className="space-y-1.5 text-sm">
              <p className="font-medium">{o.customerName}</p>
              <a href={`tel:${o.customerPhone}`} className="flex items-center gap-2 text-muted-foreground hover:text-foreground"><Phone className="h-3.5 w-3.5" />{o.customerPhone}</a>
              <a href={whatsappLink(o.customerPhone, `Hello ${o.customerName.split(" ")[0]}, this is about your order ${o.orderNumber}.`)} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-muted-foreground hover:text-foreground"><MessageCircle className="h-3.5 w-3.5" />WhatsApp</a>
              {o.customerEmail && <p className="text-muted-foreground break-all">{o.customerEmail}</p>}
              <div className="pt-2 border-t">
                {pickup ? <p className="flex items-center gap-2 font-medium"><Store className="h-4 w-4" /> In-store pickup</p>
                  : <><p className="flex items-center gap-2 font-medium"><MapPin className="h-4 w-4" /> Delivery{o.deliveryZone ? ` · ${o.deliveryZone}` : ""}</p><p className="text-muted-foreground">{o.deliveryAddress}</p></>}
                {o.riderName && <p className="text-xs text-muted-foreground mt-1">Rider: {o.riderName} · {o.riderPhone}</p>}
                {o.notes && <p className="text-xs italic text-muted-foreground mt-1">“{o.notes}”</p>}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-base">Payment</CardTitle></CardHeader>
            <CardContent className="space-y-1 text-sm">
              <Row k="Method" v={paymentLabel(o.paymentMethod)} />
              <Row k="Status" v={o.paymentStatus === "PAID" ? "Paid" : o.paymentStatus === "ON_DELIVERY" ? "Due on handover" : o.paymentStatus === "AWAITING_VERIFICATION" ? "Verify" : "Unpaid"} />
              {o.mpesaReceiptNumber && <Row k="M-Pesa code" v={<span className="font-mono">{o.mpesaReceiptNumber}</span>} />}
              {o.paymentReference && !o.mpesaReceiptNumber && <Row k="Customer's code" v={<span className="font-mono">{o.paymentReference}</span>} />}
              {o.paidAt && <Row k="Paid" v={fmtDate(o.paidAt)} />}
              {o.refundedAmount > 0 && <Row k="Refunded" v={<span className="text-destructive">{money(o.refundedAmount)}</span>} />}
            </CardContent>
          </Card>

          {o.returns.length > 0 && (
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-base">Returns</CardTitle></CardHeader>
              <CardContent className="space-y-2 text-sm">
                {o.returns.map(r => (
                  <Link key={r.id} to={`/admin/returns/${r.id}`} className="flex justify-between hover:underline"><span>{r.kind === "CANCELLED_DISPATCH" ? "Failed delivery" : "Customer return"}</span><Badge variant="outline">{r.status === "REFUNDED" && r.refundAmount ? `refunded ${money(r.refundAmount)}` : r.status.toLowerCase()}</Badge></Link>
                ))}
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-base">Customer messages</CardTitle></CardHeader>
            <CardContent className="space-y-1.5 text-xs">
              {o.notifications.length === 0 && <p className="text-muted-foreground">None sent yet.</p>}
              {o.notifications.map((n, i) => (
                <div key={i} className="flex justify-between gap-2" title={n.error ?? ""}>
                  <span>{n.milestone.replace(/_/g, " ")} · {n.channel === "EMAIL" ? "email" : "WhatsApp"}</span>
                  <span className={n.status === "SENT" ? "text-emerald-600 dark:text-emerald-400" : n.status === "FAILED" ? "text-destructive" : "text-muted-foreground"}>{n.status.toLowerCase()}</span>
                </div>
              ))}
              <p className="text-muted-foreground pt-1">&ldquo;skipped&rdquo; = no email address or sender account set up.</p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* dialogs */}
      {dlg.kind === "receive" && <ReceiveDialog line={dlg.line} onClose={() => setDlg({ kind: "none" })} busy={busy} onSubmit={body => run(`items/${dlg.line.id}/source`, { source: "supplier", ...body })} />}
      {dlg.kind === "plan" && <PlanDialog line={dlg.line} onClose={() => setDlg({ kind: "none" })} busy={busy} onSubmit={body => run(`items/${dlg.line.id}/plan`, body)} />}
      {dlg.kind === "dispatch" && <DispatchDialog onClose={() => setDlg({ kind: "none" })} busy={busy} onSubmit={body => run(`${o.id}/dispatch`, body)} />}
      {dlg.kind === "text" && <TextDialog d={dlg} busy={busy} onClose={() => setDlg({ kind: "none" })} onSubmit={v => run(dlg.path, { [dlg.field]: v })} />}
      {dlg.kind === "invoice" && o.invoice && (
        <Dialog open onOpenChange={x => { if (!x) setDlg({ kind: "none" }); }}>
          <DialogContent>
            <DialogHeader><DialogTitle>Invoice {o.invoice.invoiceNumber}</DialogTitle><DialogDescription>Issued {fmtDate(o.invoice.issuedAt)}. It cannot be edited: cancel and re-order for any change.</DialogDescription></DialogHeader>
            <div className="text-sm space-y-1">
              {o.invoice.snapshot.lines.map((l, i) => <Row key={i} k={`${l.quantity} × ${l.name}`} v={money(l.total)} />)}
              <div className="flex justify-between font-semibold pt-1 border-t"><span>Total</span><span>{money(o.invoice.snapshot.total)}</span></div>
            </div>
            <DialogFooter><Button onClick={() => { if (!printInvoice(o.invoice!.invoiceNumber, o.invoice!.issuedAt, o.invoice!.snapshot)) toast({ title: "Pop-up blocked", description: "Allow pop-ups to print the invoice.", variant: "destructive" }); }}>Print / save as PDF</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

const Row = ({ k, v }: { k: string; v: React.ReactNode }) => (
  <div className="flex justify-between gap-3"><span className="text-muted-foreground">{k}</span><span>{v}</span></div>
);

// ── small dialogs ────────────────────────────────────────────────────────

function TextDialog({ d, busy, onClose, onSubmit }: { d: Extract<Dialogs, { kind: "text" }>; busy: boolean; onClose: () => void; onSubmit: (v: string) => void }) {
  const [v, setV] = useState("");
  return (
    <Dialog open onOpenChange={x => { if (!x) onClose(); }}>
      <DialogContent>
        <DialogHeader><DialogTitle>{d.title}</DialogTitle>{d.hint && <DialogDescription>{d.hint}</DialogDescription>}</DialogHeader>
        <div className="space-y-1.5"><Label>{d.label}</Label><Input value={v} onChange={e => setV(e.target.value)} autoFocus /></div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Back</Button>
          <Button variant={d.destructive ? "destructive" : "default"} disabled={busy || v.trim().length < 3} onClick={() => onSubmit(v.trim())}>{busy && <Loader2 className="h-4 w-4 animate-spin" />} {d.cta}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function DispatchDialog({ onClose, busy, onSubmit }: { onClose: () => void; busy: boolean; onSubmit: (b: { riderName: string; riderPhone: string }) => void }) {
  const [name, setName] = useState(""); const [phone, setPhone] = useState("");
  return (
    <Dialog open onOpenChange={x => { if (!x) onClose(); }}>
      <DialogContent>
        <DialogHeader><DialogTitle>Hand over to rider</DialogTitle><DialogDescription>Stock leaves the shop when you confirm. Only do this when the goods are actually in the rider&apos;s hands.</DialogDescription></DialogHeader>
        <div className="grid sm:grid-cols-2 gap-3">
          <div className="space-y-1.5"><Label>Rider name</Label><Input value={name} onChange={e => setName(e.target.value)} autoFocus /></div>
          <div className="space-y-1.5"><Label>Rider phone</Label><Input type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="0712 345 678" /></div>
        </div>
        <DialogFooter><Button variant="outline" onClick={onClose}>Back</Button>
          <Button disabled={busy || name.trim().length < 2 || phone.replace(/\D/g, "").length < 9} onClick={() => onSubmit({ riderName: name.trim(), riderPhone: phone.trim() })}>{busy && <Loader2 className="h-4 w-4 animate-spin" />} Confirm handoff</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ReceiveDialog({ line, onClose, busy, onSubmit }: { line: OrderLine; onClose: () => void; busy: boolean; onSubmit: (b: Record<string, unknown>) => void }) {
  const { data: suppliers } = useQuery({ queryKey: ["suppliers"], queryFn: () => api<Supplier[]>("/inventory/suppliers") });
  const remaining = line.quantity - line.picked;
  const [qty, setQty] = useState(String(remaining)); const [supplierId, setSupplierId] = useState(line.planSupplierId ?? "");
  const [cost, setCost] = useState(""); const [ref, setRef] = useState("");
  // one id per dialog: a double-click or retry cannot add the goods twice
  const [receiptId] = useState(() => crypto.randomUUID());
  const n = Number(qty);
  return (
    <Dialog open onOpenChange={x => { if (!x) onClose(); }}>
      <DialogContent>
        <DialogHeader><DialogTitle>Receive from supplier</DialogTitle><DialogDescription>{line.name}. The goods are added to stock and picked for this order in one step.</DialogDescription></DialogHeader>
        <div className="grid sm:grid-cols-2 gap-3">
          <div className="space-y-1.5"><Label>Quantity received (max {remaining})</Label><Input type="number" min={1} max={remaining} value={qty} onChange={e => setQty(e.target.value)} autoFocus /></div>
          <div className="space-y-1.5"><Label>Supplier</Label>
            <select className={select} value={supplierId} onChange={e => setSupplierId(e.target.value)}><option value="">Select…</option>{suppliers?.filter(s => s.isActive).map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select></div>
          <div className="space-y-1.5"><Label>Cost per unit (KES)</Label><Input type="number" min={0} value={cost} onChange={e => setCost(e.target.value)} /></div>
          <div className="space-y-1.5"><Label>Invoice / delivery note no.</Label><Input value={ref} onChange={e => setRef(e.target.value)} /></div>
        </div>
        <DialogFooter><Button variant="outline" onClick={onClose}>Back</Button>
          <Button disabled={busy || !Number.isInteger(n) || n < 1 || n > remaining} onClick={() => onSubmit({ quantity: n, receiptId, supplierId: supplierId || undefined, unitCost: cost ? Number(cost) : undefined, reference: ref.trim() || undefined })}>{busy && <Loader2 className="h-4 w-4 animate-spin" />} Receive &amp; pick</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function PlanDialog({ line, onClose, busy, onSubmit }: { line: OrderLine; onClose: () => void; busy: boolean; onSubmit: (b: Record<string, unknown>) => void }) {
  const { data: suppliers } = useQuery({ queryKey: ["suppliers"], queryFn: () => api<Supplier[]>("/inventory/suppliers") });
  const [supplierId, setSupplierId] = useState(line.planSupplierId ?? ""); const [date, setDate] = useState(line.planExpectedDate?.slice(0, 10) ?? ""); const [note, setNote] = useState(line.planNote ?? "");
  return (
    <Dialog open onOpenChange={x => { if (!x) onClose(); }}>
      <DialogContent>
        <DialogHeader><DialogTitle>Sourcing plan</DialogTitle><DialogDescription>{line.name}. A note for the team; it doesn&apos;t move any stock.</DialogDescription></DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5"><Label>Supplier</Label><select className={select} value={supplierId} onChange={e => setSupplierId(e.target.value)}><option value="">Not decided</option>{suppliers?.filter(s => s.isActive).map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select></div>
          <div className="space-y-1.5"><Label>Expected date</Label><Input type="date" value={date} onChange={e => setDate(e.target.value)} /></div>
          <div className="space-y-1.5"><Label>Note</Label><Input value={note} onChange={e => setNote(e.target.value)} placeholder="e.g. Called Computer Planet, arriving Thursday" /></div>
        </div>
        <DialogFooter><Button variant="outline" onClick={onClose}>Back</Button>
          <Button disabled={busy} onClick={() => onSubmit({ supplierId: supplierId || undefined, expectedDate: date || undefined, note: note.trim() || undefined })}>Save plan</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function DeliveryFixer({ o, busy, run }: { o: OrderDetail; busy: boolean; run: (p: string, b?: Record<string, unknown>) => void }) {
  const { data: zones } = useQuery({ queryKey: ["zones-all"], queryFn: () => api<Zone[]>("/zones/all") });
  const [zoneId, setZoneId] = useState(""); const [fee, setFee] = useState("");
  return (
    <div className="flex flex-wrap items-end gap-3">
      <div className="space-y-1.5"><Label>Assign a zone</Label>
        <select className={select + " w-52"} value={zoneId} onChange={e => { setZoneId(e.target.value); setFee(""); }}><option value="">Or enter a custom fee →</option>{zones?.filter(z => z.isActive).map(z => <option key={z.id} value={z.id}>{z.name} · {money(z.fee)}</option>)}</select></div>
      {!zoneId && <div className="space-y-1.5"><Label>Custom fee (KES)</Label><Input type="number" min={0} className="w-32" value={fee} onChange={e => setFee(e.target.value)} /></div>}
      <Button variant="outline" disabled={busy || (!zoneId && fee === "")} onClick={() => run(`${o.id}/delivery`, zoneId ? { zoneId } : { fee: Number(fee) })}>Set delivery fee</Button>
    </div>
  );
}
