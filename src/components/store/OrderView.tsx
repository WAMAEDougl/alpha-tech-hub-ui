import { Link } from "react-router-dom";
import { Check, Circle, MapPin, Store, Truck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { money } from "@/lib/api";
import { journeySteps, STAGE_ORDER, type PublicOrder } from "@/lib/publicOrder";
import PaymentPanel from "./PaymentPanel";

const when = (iso: string) => new Date(iso).toLocaleString("en-KE", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

/** A customer's order: where it is, what to do next, what's in it. */
export default function OrderView({ order, phone, onUpdated, returnLink }: { order: PublicOrder; phone: string; onUpdated: (o: PublicOrder) => void; returnLink: string }) {
  const cancelled = order.journeyStage === "cancelled";
  const paysMpesa = order.paymentMethod !== "CASH";
  const steps = journeySteps(order.pickup, paysMpesa);
  const idx = STAGE_ORDER.indexOf(order.journeyStage);
  const current = steps.findIndex(s => s.stages.includes(order.journeyStage));
  const done = order.journeyStage === "delivered" || order.journeyStage === "picked_up";

  return (
    <div className="space-y-5">
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <CardTitle className="font-mono text-lg">{order.orderNumber}</CardTitle>
            <span className={`text-sm font-medium px-3 py-1 rounded-full ${cancelled ? "bg-destructive/15 text-destructive" : done ? "bg-green-500/15 text-green-700 dark:text-green-400" : "bg-primary/10 text-primary"}`}>{order.journeyLabel}</span>
          </div>
          <p className="text-xs text-muted-foreground">Placed {when(order.createdAt)}</p>
        </CardHeader>
        <CardContent className="space-y-5">
          {cancelled ? (
            <p className="text-sm text-destructive">This order was cancelled. Please contact us if you have questions.</p>
          ) : (
            <ol className="space-y-3">
              {steps.map((s, i) => {
                const reached = done || i < current || (i === current && idx >= 0);
                const active = !done && i === current;
                return (
                  <li key={s.label} className="flex items-center gap-3 text-sm">
                    {reached && !active ? <span className="flex h-6 w-6 items-center justify-center rounded-full bg-green-500 text-white"><Check className="h-3.5 w-3.5" /></span>
                      : active ? <span className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-primary"><span className="h-2 w-2 rounded-full bg-primary animate-pulse" /></span>
                      : <Circle className="h-6 w-6 text-muted-foreground/30" />}
                    <span className={active ? "font-semibold" : reached ? "" : "text-muted-foreground"}>{s.label}</span>
                  </li>
                );
              })}
            </ol>
          )}

          {order.rider && (order.rider.name || order.rider.phone) && (
            <div className="rounded-lg bg-muted/50 p-3 text-sm flex items-center gap-2"><Truck className="h-4 w-4" /> Your rider: <b>{order.rider.name}</b>{order.rider.phone && <a className="underline" href={`tel:${order.rider.phone}`}>{order.rider.phone}</a>}</div>
          )}
          {order.journeyStage === "ready_for_pickup" && (
            <div className="rounded-lg bg-muted/50 p-3 text-sm flex items-center gap-2"><Store className="h-4 w-4" /> Ready for you to collect at our shop.{order.paymentMethod === "CASH" ? ` Please bring ${money(order.totalAmount)}.` : ""}</div>
          )}
          {order.journeyStage === "on_the_way" && order.paymentMethod === "CASH" && (
            <p className="text-sm text-muted-foreground">Please have <b className="text-foreground">{money(order.totalAmount)}</b> ready for the rider.</p>
          )}
          {!order.deliveryResolved && !order.pickup && !cancelled && (
            <p className="text-sm rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 p-3">Your address is outside our usual delivery areas. We&apos;ll call you to agree the delivery fee before we continue.</p>
          )}
        </CardContent>
      </Card>

      {!cancelled && <PaymentPanel order={order} phone={phone} onUpdated={onUpdated} />}

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-base">Order details</CardTitle></CardHeader>
        <CardContent className="space-y-2 text-sm">
          {order.items.map(i => <div key={i.id} className="flex justify-between gap-3"><span className="text-muted-foreground">{i.name} × {i.quantity}</span><span>{money(i.unitPrice * i.quantity)}</span></div>)}
          <div className="border-t pt-2 space-y-1">
            <div className="flex justify-between text-muted-foreground"><span>Subtotal</span><span>{money(order.subtotal)}</span></div>
            <div className="flex justify-between text-muted-foreground"><span>Delivery{order.deliveryZone ? ` (${order.deliveryZone})` : ""}</span><span>{order.pickup ? "Free (pickup)" : order.deliveryResolved ? money(order.deliveryFee) : "To be confirmed"}</span></div>
            {order.discountAmount > 0 && <div className="flex justify-between text-green-600 dark:text-green-400"><span>Discount</span><span>-{money(order.discountAmount)}</span></div>}
            <div className="flex justify-between font-semibold pt-1"><span>Total</span><span>{money(order.totalAmount)}</span></div>
          </div>
          <div className="border-t pt-2 flex items-start gap-2 text-muted-foreground">
            {order.pickup ? <><Store className="h-4 w-4 mt-0.5" /> In-store pickup</> : <><MapPin className="h-4 w-4 mt-0.5" /> <span>{order.deliveryAddress}{order.estimatedDays ? ` · ${order.estimatedDays}` : ""}</span></>}
          </div>
          {order.invoiceNumber && <p className="text-xs text-muted-foreground">Invoice {order.invoiceNumber}</p>}
        </CardContent>
      </Card>

      {order.timeline.length > 1 && (
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base">Updates</CardTitle></CardHeader>
          <CardContent><ol className="space-y-1.5 text-sm">{[...order.timeline].reverse().map((t, i) => <li key={i} className="flex justify-between gap-3"><span>{t.label}</span><span className="text-xs text-muted-foreground">{when(t.at)}</span></li>)}</ol></CardContent>
        </Card>
      )}

      {order.returnEligible && !order.hasReturn && (
        <div className="text-center"><Button asChild variant="outline"><Link to={returnLink}>Return an item</Link></Button></div>
      )}
      {order.refundedAmount > 0 && <p className="text-center text-sm rounded-lg bg-green-500/10 text-green-700 dark:text-green-400 p-3">A refund of <b>{money(order.refundedAmount)}</b> has been sent to you.</p>}
      {order.hasReturn && order.refundedAmount === 0 && <p className="text-center text-sm text-muted-foreground">A return has been requested for this order. We&apos;ll be in touch.</p>}
    </div>
  );
}
