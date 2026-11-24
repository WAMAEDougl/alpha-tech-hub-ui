import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, Loader2, MapPin, Store } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { api, money } from "@/lib/api";
import { ago, fmtDate, paymentLabel, statusBadge, type OrderRow } from "./orderTypes";

/** A queue of orders. Oldest first for work queues, so nobody waits longer than they have to. */
export default function OrdersTable({ lane, search = "", empty, compact = false }: { lane?: string; search?: string; empty: string; compact?: boolean }) {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["orders", lane ?? "all", search],
    queryFn: () => api<OrderRow[]>(`/orders?${lane ? `lane=${lane}&` : ""}search=${encodeURIComponent(search)}`),
    refetchInterval: 20_000,
    placeholderData: prev => prev,
  });

  if (isLoading) return <Loader2 className="h-5 w-5 animate-spin mx-auto my-12 text-muted-foreground" />;
  if (error) {
    return (
      <div className="p-8 text-center space-y-2">
        <p className="text-sm text-destructive">{(error as Error).message}</p>
        <Button size="sm" variant="outline" onClick={() => refetch()}>Try again</Button>
      </div>
    );
  }
  if (!data?.length) return <p className="p-10 text-sm text-center text-muted-foreground">{search ? "No orders match your search." : empty}</p>;

  const waiting = lane && lane !== "closed";
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {data.map(o => {
        const b = statusBadge(o);
        return (
          <Link key={o.id} to={`/admin/orders/${o.id}`}>
            <Card className="h-full hover:border-primary/50 transition-colors">
              <CardContent className={compact ? "p-3 space-y-1.5" : "p-4 space-y-2"}>
                <div className="flex items-start justify-between gap-2">
                  <span className="font-mono text-xs">{o.orderNumber}</span>
                  <span className="text-xs text-muted-foreground" title={fmtDate(o.createdAt)}>{waiting ? ago(o.createdAt) : fmtDate(o.createdAt)}</span>
                </div>
                <p className="font-medium text-sm">{o.customerName}</p>
                <p className="text-xs text-muted-foreground line-clamp-2">{o.items.map(i => `${i.quantity}× ${i.name}`).join(", ")}</p>
                {o.inventoryIssue && <p className="flex items-center gap-1.5 text-xs text-amber-600 dark:text-amber-400"><AlertTriangle className="h-3.5 w-3.5" /> Needs a decision</p>}
                {!o.deliveryResolved && o.fulfillmentMode === "DELIVERY" && <p className="flex items-center gap-1.5 text-xs text-amber-600 dark:text-amber-400"><AlertTriangle className="h-3.5 w-3.5" /> Delivery fee to agree</p>}
                <div className="flex items-center justify-between gap-2 pt-1">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${b.className}`}>{b.label}</span>
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    {o.fulfillmentMode === "PICKUP" ? <Store className="h-3 w-3" /> : <MapPin className="h-3 w-3" />}{paymentLabel(o.paymentMethod).split(" ")[0]}
                  </span>
                  <span className="text-sm font-semibold">{money(o.totalAmount)}</span>
                </div>
              </CardContent>
            </Card>
          </Link>
        );
      })}
    </div>
  );
}
