import { Link, NavLink } from "@/lib/router";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { api, money } from "@/lib/api";
import OrdersTable from "./OrdersTable";
import { MovementTable, type Movement } from "./inventory/MovementTable";

interface Step { key: string; label: string; units?: number; orders?: number; hint: string; to?: string }
interface Workflow {
  pipeline: Step[];
  attention: number;
  summary: { skus: number; units: number; reserved: number; outOfStock: number; lowStock: number; stockValueAtCost: number };
  last30Days: { received: number; sold: number; returned: number; damaged: number; adjustments: number };
  recentMovements: Movement[];
}

const NAV = [
  { to: "/admin/inventory", label: "Overview", end: true },
  { to: "/admin/inventory/sourcing", label: "Source & pick" },
  { to: "/admin/inventory/packing", label: "Packing" },
  { to: "/admin/inventory/handoffs", label: "Handoffs" },
  { to: "/admin/returns", label: "Returns" },
  { to: "/admin/inventory/stock", label: "Stock levels" },
  { to: "/admin/inventory/reorder", label: "Restock plan" },
  { to: "/admin/inventory/purchase-orders", label: "Purchase orders" },
  { to: "/admin/inventory/suppliers", label: "Suppliers" },
  { to: "/admin/inventory/stock-takes", label: "Stock-takes" },
  { to: "/admin/inventory/history", label: "History" },
  { to: "/admin/inventory/insights", label: "Insights" },
  { to: "/admin/inventory/guide", label: "How it works" },
];

export function InventoryOverview() {
  const { data, isLoading, error } = useQuery({ queryKey: ["inventory", "workflow"], queryFn: () => api<Workflow>("/inventory/workflow"), refetchInterval: 30_000 });
  if (isLoading) return <Loader2 className="h-5 w-5 animate-spin mx-auto my-12 text-muted-foreground" />;
  if (error || !data) return <p className="text-sm text-destructive">{(error as Error)?.message ?? "Could not load the overview."}</p>;
  const stat = (label: string, value: string | number, warn = false, to?: string) => {
    const card = (
      <Card className={to ? "hover:border-primary/50 transition-colors h-full" : "h-full"}><CardContent className="p-4">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className={`text-2xl font-heading font-bold ${warn && Number(value) > 0 ? "text-destructive" : ""}`}>{value}</p>
      </CardContent></Card>
    );
    return to ? <Link to={to}>{card}</Link> : card;
  };
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-sm font-medium text-muted-foreground mb-3">How orders and product move through the shop</h2>
        <div className="flex flex-wrap items-stretch gap-2">
          {data.pipeline.map((s, i) => {
            const card = (
              <Card className={`min-w-[150px] h-full ${s.to ? "hover:border-primary/50 transition-colors" : ""}`}>
                <CardContent className="p-4">
                  <p className="text-2xl font-heading font-bold">{s.units ?? s.orders ?? 0}</p>
                  <p className="text-sm font-medium leading-tight">{s.label}</p>
                  <p className="text-xs text-muted-foreground mt-1">{s.units !== undefined ? "units" : "orders"} · {s.hint}</p>
                </CardContent>
              </Card>
            );
            return (
              <div key={s.key} className="flex items-center gap-2">
                {s.to ? <Link to={s.to} className="h-full">{card}</Link> : card}
                {i < data.pipeline.length - 1 && <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />}
              </div>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        {stat("Products", data.summary.skus)}
        {stat("Units on shelf", data.summary.units)}
        {stat("Reserved for orders", data.summary.reserved)}
        {stat("Low / out of stock", data.summary.lowStock + data.summary.outOfStock, true, "/admin/inventory/reorder")}
        {stat("Stock value (cost)", money(data.summary.stockValueAtCost))}
      </div>
      {data.attention > 0 && (
        <Card className="border-amber-500/60"><CardContent className="p-4 text-sm">
          <b>{data.attention}</b> order{data.attention === 1 ? " is" : "s are"} waiting for an office decision. <Link className="underline" to="/admin/orders?lane=attention">See them</Link>
        </CardContent></Card>
      )}

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-base">Last 30 days</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-2 sm:grid-cols-5 gap-4 text-sm">
          <div><p className="text-muted-foreground text-xs">Received</p><p className="font-bold text-lg">+{data.last30Days.received}</p></div>
          <div><p className="text-muted-foreground text-xs">Left the shop</p><p className="font-bold text-lg">{data.last30Days.sold}</p></div>
          <div><p className="text-muted-foreground text-xs">Returned to shelf</p><p className="font-bold text-lg">{data.last30Days.returned}</p></div>
          <div><p className="text-muted-foreground text-xs">Written off</p><p className="font-bold text-lg">{data.last30Days.damaged}</p></div>
          <div><p className="text-muted-foreground text-xs">Stock-take changes</p><p className="font-bold text-lg">{data.last30Days.adjustments > 0 ? "+" : ""}{data.last30Days.adjustments}</p></div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-0"><CardTitle className="text-base">Latest stock movements</CardTitle></CardHeader>
        <CardContent className="p-0"><MovementTable rows={data.recentMovements} /></CardContent>
      </Card>
    </div>
  );
}

export const InventoryLane = ({ title, intro, lane, empty }: { title: string; intro: string; lane: string; empty: string }) => (
  <div className="space-y-4">
    <div><h2 className="text-lg font-heading font-semibold">{title}</h2><p className="text-sm text-muted-foreground">{intro}</p></div>
    <OrdersTable lane={lane} empty={empty} />
  </div>
);

export const InventoryHistory = () => {
  const { data, isLoading, error } = useQuery({ queryKey: ["inventory", "history"], queryFn: () => api<Movement[]>("/inventory/movements?limit=300") });
  return (
    <Card><CardContent className="p-0">
      {isLoading ? <Loader2 className="h-5 w-5 animate-spin mx-auto my-12 text-muted-foreground" />
        : error ? <p className="p-6 text-sm text-destructive">{(error as Error).message}</p>
        : <MovementTable rows={data ?? []} />}
    </CardContent></Card>
  );
};

/** The inventory team's workspace: a shared heading and navigation; each tab is its own page. */
export function InventoryShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-heading font-bold">Inventory</h1>
        <p className="text-sm text-muted-foreground">Every stock change is recorded: who, when and why.</p>
      </div>
      <nav className="flex gap-1 overflow-x-auto border-b pb-px -mx-1 px-1">
        {NAV.map(n => (
          <NavLink key={n.to} to={n.to} end={n.end}
            className={({ isActive }) => `shrink-0 px-3 py-2 text-sm border-b-2 -mb-px transition-colors ${isActive ? "border-primary text-foreground font-medium" : "border-transparent text-muted-foreground hover:text-foreground"}`}>
            {n.label}
          </NavLink>
        ))}
      </nav>
      {children}
    </div>
  );
}
