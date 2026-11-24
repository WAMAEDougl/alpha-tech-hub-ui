import { Link } from "@/lib/router";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, BadgeCheck, ClipboardCheck, DollarSign, Loader2, PackageCheck, Truck, Warehouse } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { api, money } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { ago, statusBadge, type OrderRow } from "./orderTypes";

interface Counts { [lane: string]: { count: number; oldest: string | null } }
interface Workflow { summary: { lowStock: number; outOfStock: number } }
interface Analytics { revenue: { totalThisYear: number; monthly: { month: string; revenue: number }[] } }

const DashboardOverview = () => {
  const { user } = useAuth();
  const isAdmin = user?.role === "ADMIN";

  const counts = useQuery({ queryKey: ["orders", "counts"], queryFn: () => api<Counts>("/orders/counts"), refetchInterval: 30_000 });
  const wf = useQuery({ queryKey: ["inventory", "workflow"], queryFn: () => api<Workflow>("/inventory/workflow"), refetchInterval: 30_000 });
  const recent = useQuery({ queryKey: ["orders", "recent"], queryFn: () => api<OrderRow[]>("/orders?lane=attention"), refetchInterval: 30_000 });
  // revenue is admin-only on the server too
  const analytics = useQuery({ queryKey: ["analytics"], queryFn: () => api<Analytics>("/analytics/dashboard"), enabled: isAdmin });

  const n = (lane: string) => counts.data?.[lane]?.count;
  const oldest = (lane: string) => { const o = counts.data?.[lane]?.oldest; return o ? `oldest ${ago(o)}` : undefined; };
  const low = wf.data ? wf.data.summary.lowStock + wf.data.summary.outOfStock : undefined;

  // what each team needs to do right now
  const tiles = isAdmin
    ? [
        { label: "M-Pesa codes to verify", value: n("verify"), hint: oldest("verify"), icon: BadgeCheck, to: "/admin/orders?lane=verify" },
        { label: "Ready to approve", value: n("review"), hint: oldest("review"), icon: ClipboardCheck, to: "/admin/orders?lane=review" },
        { label: "In the warehouse", value: n("warehouse"), icon: Warehouse, to: "/admin/orders?lane=warehouse" },
        { label: "Needs a decision", value: n("attention"), icon: AlertTriangle, to: "/admin/orders?lane=attention" },
      ]
    : [
        { label: "To source & pick", value: n("sourcing"), hint: oldest("sourcing"), icon: PackageCheck, to: "/admin/inventory/sourcing" },
        { label: "To pack", value: n("packing"), hint: oldest("packing"), icon: Warehouse, to: "/admin/inventory/packing" },
        { label: "Handoffs", value: n("handoffs"), hint: oldest("handoffs"), icon: Truck, to: "/admin/inventory/handoffs" },
        { label: "Low / out of stock", value: low, icon: AlertTriangle, to: "/admin/inventory/reorder" },
      ];

  const monthly = [...(analytics.data?.revenue.monthly ?? [])].reverse();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-heading font-bold">Welcome back{user ? `, ${user.name.split(" ")[0]}` : ""}</h1>
        <p className="text-sm text-muted-foreground">Here&apos;s what needs your attention today.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {tiles.map(t => (
          <Link key={t.label} to={t.to}>
            <Card className="hover:border-primary/50 transition-colors h-full">
              <CardContent className="p-5">
                <div className="flex items-center justify-between mb-3"><span className="text-sm text-muted-foreground">{t.label}</span><t.icon className="h-5 w-5 text-primary" /></div>
                <p className="text-2xl font-heading font-bold">{t.value ?? "…"}</p>
                {t.hint && <p className="text-xs text-muted-foreground mt-1">{t.hint}</p>}
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {(counts.error || wf.error) && <p className="text-sm text-destructive">Some figures couldn&apos;t be loaded: {((counts.error || wf.error) as Error).message}</p>}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle className="text-lg">Needs attention</CardTitle></CardHeader>
          <CardContent className="p-0">
            {recent.isLoading ? <Loader2 className="h-5 w-5 animate-spin mx-auto my-8 text-muted-foreground" />
              : !recent.data?.length ? <p className="p-6 text-sm text-muted-foreground text-center">Nothing is stuck. Orders are flowing.</p>
              : (
                <ul className="divide-y">
                  {recent.data.slice(0, 6).map(o => {
                    const b = statusBadge(o);
                    return (
                      <li key={o.id}>
                        <Link to={`/admin/orders/${o.id}`} className="flex items-center justify-between gap-3 px-6 py-3 hover:bg-muted/50">
                          <div className="min-w-0">
                            <p className="font-medium text-sm truncate">{o.customerName} <span className="font-mono text-xs text-muted-foreground">{o.orderNumber}</span></p>
                            <p className="text-xs text-muted-foreground">{ago(o.createdAt)} · {money(o.totalAmount)}{o.inventoryIssue ? " · inventory needs a decision" : ""}</p>
                          </div>
                          <span className={`text-xs px-2 py-0.5 rounded-full shrink-0 ${b.className}`}>{b.label}</span>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              )}
          </CardContent>
        </Card>

        {isAdmin && (
          <Card>
            <CardHeader><CardTitle className="text-lg flex items-center justify-between">Monthly revenue {analytics.data && <span className="text-sm font-normal text-muted-foreground"><DollarSign className="inline h-3.5 w-3.5" /> {money(analytics.data.revenue.totalThisYear)} this year</span>}</CardTitle></CardHeader>
            <CardContent>
              {analytics.isLoading ? <Loader2 className="h-5 w-5 animate-spin mx-auto my-8 text-muted-foreground" />
                : monthly.length === 0 ? <p className="py-12 text-sm text-muted-foreground text-center">Revenue appears here once orders are paid.</p>
                : (
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={monthly}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                      <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                      <Tooltip formatter={(v: number) => money(v)} contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, color: "hsl(var(--card-foreground))" }} />
                      <Bar dataKey="revenue" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

export default DashboardOverview;
