import { useEffect, useState } from "react";
import { Link, Navigate, useNavigate, useParams, useSearchParams } from "@/lib/router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, MapPin, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api, money } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import type { JourneyStage, PublicOrder } from "@/lib/publicOrder";
import OrderView from "@/components/store/OrderView";
import Header from "@/components/landing/Header";
import Footer from "@/components/landing/Footer";

const Shell = ({ children, narrow = true }: { children: React.ReactNode; narrow?: boolean }) => (
  <div className="min-h-screen">
    <Header />
    <main className="pt-16"><div className={`container mx-auto px-6 lg:px-10 py-10 space-y-6 ${narrow ? "max-w-md" : "max-w-3xl"}`}>{children}</div></main>
    <Footer />
  </div>
);

const stageLabel: Record<JourneyStage, string> = {
  to_pay: "Awaiting payment", verifying: "Verifying payment", processing: "Confirmed", packing: "Being packed", on_the_way: "Out for delivery",
  ready_for_pickup: "Ready for pickup", delivered: "Delivered", picked_up: "Picked up", cancelled: "Cancelled",
};

// ── sign in / register ─────────────────────────────────────────────────────

export function LoginPage({ register = false }: { register?: boolean }) {
  const { user, loading, login, register: signUp } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const from = params.get("from") ?? undefined;
  const keep = from ? `?from=${encodeURIComponent(from)}` : "";
  const [f, setF] = useState({ name: "", email: "", phone: "", password: "" });
  const [busy, setBusy] = useState(false); const [error, setError] = useState("");

  if (!loading && user) return <Navigate to={user.role === "CUSTOMER" ? from ?? "/account" : "/admin"} replace />;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true); setError("");
    try {
      const u = register ? await signUp({ name: f.name.trim(), email: f.email, password: f.password, phone: f.phone }) : await login(f.email, f.password);
      navigate(u.role === "CUSTOMER" ? from ?? "/account" : "/admin", { replace: true });
    } catch (err) { setError((err as Error).message || "Something went wrong."); setF(x => ({ ...x, password: "" })); }
    finally { setBusy(false); }
  }
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) => setF(x => ({ ...x, [k]: e.target.value }));
  const ok = f.email && f.password.length >= (register ? 8 : 1) && (!register || f.name.trim().length >= 2);

  return (
    <Shell>
      <h1 className="text-3xl font-bold text-center">{register ? "Create your account" : "Sign in"}</h1>
      <Card><CardContent className="p-5">
        <form onSubmit={submit} className="space-y-4" noValidate>
          {register && <div className="space-y-1.5"><Label htmlFor="n">Full name</Label><Input id="n" autoComplete="name" value={f.name} onChange={set("name")} /></div>}
          <div className="space-y-1.5"><Label htmlFor="e">Email</Label><Input id="e" type="email" autoComplete="username" value={f.email} onChange={set("email")} /></div>
          {register && <div className="space-y-1.5"><Label htmlFor="p">Phone <span className="text-muted-foreground font-normal">(optional)</span></Label><Input id="p" type="tel" autoComplete="tel" value={f.phone} onChange={set("phone")} /></div>}
          <div className="space-y-1.5"><Label htmlFor="pw">Password{register ? " (8+ characters)" : ""}</Label><Input id="pw" type="password" autoComplete={register ? "new-password" : "current-password"} value={f.password} onChange={set("password")} /></div>
          {error && <p role="alert" className="text-sm text-destructive bg-destructive/10 rounded-md px-3 py-2">{error}</p>}
          <Button type="submit" className="w-full" disabled={busy || !ok}>{busy && <Loader2 className="h-4 w-4 animate-spin" />} {register ? "Create account" : "Sign in"}</Button>
        </form>
      </CardContent></Card>
      <p className="text-center text-sm text-muted-foreground">
        {register ? <>Already have an account? <Link className="underline" to={`/login${keep}`}>Sign in</Link></> : <>New here? <Link className="underline" to={`/register${keep}`}>Create an account</Link></>}
        <br />You don&apos;t need an account to order: you can <Link className="underline" to="/track">track an order</Link> with its number and your phone.
      </p>
    </Shell>
  );
}

// ── my account ─────────────────────────────────────────────────────────────

interface MyOrder { orderNumber: string; createdAt: string; totalAmount: number; journeyStage: JourneyStage; tab: string; itemCount: number; items: string[]; moreItems: number; needsPayment: boolean }
interface Address { id: string; label: string; fullName: string; phone: string; area: string; addressLine: string; isDefault: boolean }
const TABS = [["all", "All"], ["to_pay", "To pay"], ["to_ship", "To ship"], ["to_receive", "To receive"], ["delivered", "Delivered"], ["cancelled", "Cancelled"]] as const;

function Orders() {
  const [tab, setTab] = useState("all");
  const { data, isLoading, error } = useQuery({ queryKey: ["my-orders"], queryFn: () => api<MyOrder[]>("/me/orders"), refetchInterval: 30_000 });
  const list = (data ?? []).filter(o => tab === "all" || o.tab === tab);
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">{TABS.map(([k, l]) => {
        const n = k === "all" ? undefined : data?.filter(o => o.tab === k).length;
        return <button key={k} onClick={() => setTab(k)} className={`text-sm px-3 py-1.5 rounded-full border ${tab === k ? "bg-primary text-primary-foreground border-primary" : "hover:bg-muted"}`}>{l}{n ? ` (${n})` : ""}</button>;
      })}</div>
      {isLoading ? <Loader2 className="h-5 w-5 animate-spin mx-auto my-10 text-muted-foreground" />
        : error ? <p className="text-sm text-destructive">{(error as Error).message}</p>
        : list.length === 0 ? <Card><CardContent className="p-10 text-center text-sm text-muted-foreground">{data?.length ? "No orders here." : <>You haven&apos;t ordered yet. <Link to="/#catalog" className="underline">Start shopping</Link></>}</CardContent></Card>
        : list.map(o => (
          <Link key={o.orderNumber} to={`/account/orders/${o.orderNumber}`}>
            <Card className="hover:border-primary/50 transition-colors mb-3"><CardContent className="p-4 space-y-1">
              <div className="flex justify-between gap-2"><span className="font-mono text-sm">{o.orderNumber}</span><span className={`text-xs px-2 py-0.5 rounded-full ${o.journeyStage === "cancelled" ? "bg-destructive/15 text-destructive" : o.needsPayment ? "bg-amber-500/15 text-amber-700 dark:text-amber-400" : "bg-primary/10 text-primary"}`}>{stageLabel[o.journeyStage]}</span></div>
              <p className="text-sm text-muted-foreground">{o.items.join(", ")}{o.moreItems ? ` +${o.moreItems} more` : ""}</p>
              <div className="flex justify-between text-sm"><span className="text-xs text-muted-foreground">{new Date(o.createdAt).toLocaleDateString("en-KE", { day: "numeric", month: "short", year: "numeric" })} · {o.itemCount} item{o.itemCount === 1 ? "" : "s"}</span><b>{money(o.totalAmount)}</b></div>
              {o.needsPayment && <p className="text-xs text-amber-700 dark:text-amber-400">Tap to see how to pay.</p>}
            </CardContent></Card>
          </Link>
        ))}
    </div>
  );
}

function Addresses() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ["me-addresses"], queryFn: () => api<Address[]>("/me/addresses") });
  const [adding, setAdding] = useState(false);
  const [f, setF] = useState({ label: "Home", fullName: "", phone: "", area: "", addressLine: "" }); const [error, setError] = useState("");
  const add = useMutation({ mutationFn: () => api("/me/addresses", { body: f }), onSuccess: () => { qc.invalidateQueries({ queryKey: ["me-addresses"] }); setAdding(false); setError(""); }, onError: (e: Error) => setError(e.message) });
  const del = useMutation({ mutationFn: (id: string) => api(`/me/addresses/${id}`, { method: "DELETE" }), onSuccess: () => qc.invalidateQueries({ queryKey: ["me-addresses"] }) });
  const def = useMutation({ mutationFn: (id: string) => api(`/me/addresses/${id}/default`, { method: "PATCH" }), onSuccess: () => qc.invalidateQueries({ queryKey: ["me-addresses"] }) });
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) => setF(x => ({ ...x, [k]: e.target.value }));
  return (
    <div className="space-y-4">
      {isLoading ? <Loader2 className="h-5 w-5 animate-spin mx-auto my-10 text-muted-foreground" /> : data?.map(a => (
        <Card key={a.id}><CardContent className="p-4 flex items-start justify-between gap-3">
          <div className="text-sm space-y-0.5"><p className="font-medium flex items-center gap-2"><MapPin className="h-4 w-4" />{a.label}{a.isDefault && <span className="text-xs text-primary">default</span>}</p>
            <p>{a.fullName} · {a.phone}</p><p className="text-muted-foreground">{a.addressLine}, {a.area}</p></div>
          <div className="flex gap-1">{!a.isDefault && <Button size="sm" variant="ghost" onClick={() => def.mutate(a.id)}>Make default</Button>}
            <Button size="icon" variant="ghost" aria-label="Delete address" onClick={() => del.mutate(a.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button></div>
        </CardContent></Card>
      ))}
      {!isLoading && !data?.length && !adding && <p className="text-sm text-muted-foreground text-center py-6">No saved addresses yet.</p>}
      {adding ? (
        <Card><CardContent className="p-4 space-y-3">
          <div className="grid sm:grid-cols-2 gap-3">
            <div className="space-y-1.5"><Label>Label</Label><Input value={f.label} onChange={set("label")} /></div>
            <div className="space-y-1.5"><Label>Full name</Label><Input value={f.fullName} onChange={set("fullName")} /></div>
            <div className="space-y-1.5"><Label>Phone</Label><Input type="tel" value={f.phone} onChange={set("phone")} /></div>
            <div className="space-y-1.5"><Label>Town / estate</Label><Input value={f.area} onChange={set("area")} placeholder="e.g. Nanyuki" /></div>
          </div>
          <div className="space-y-1.5"><Label>Street, building or landmark</Label><Input value={f.addressLine} onChange={set("addressLine")} /></div>
          {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
          <div className="flex gap-2"><Button disabled={add.isPending || !f.fullName || !f.phone || !f.area || f.addressLine.length < 3} onClick={() => add.mutate()}>Save address</Button><Button variant="ghost" onClick={() => setAdding(false)}>Cancel</Button></div>
        </CardContent></Card>
      ) : <Button variant="outline" onClick={() => setAdding(true)}><Plus className="h-4 w-4" /> Add an address</Button>}
    </div>
  );
}

export function AccountPage() {
  const { user, loading, logout } = useAuth();
  const [view, setView] = useState<"orders" | "addresses">("orders");
  if (loading) return <Shell narrow={false}><Loader2 className="h-5 w-5 animate-spin mx-auto my-16 text-muted-foreground" /></Shell>;
  if (!user) return <Navigate to="/login?from=%2Faccount" replace />;
  return (
    <Shell narrow={false}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div><h1 className="text-3xl font-bold">My account</h1><p className="text-sm text-muted-foreground">{user.name} · {user.email}</p></div>
        <div className="flex gap-2">{user.role !== "CUSTOMER" && <Button asChild variant="outline"><Link to="/admin">Back office</Link></Button>}<Button variant="outline" onClick={logout}>Sign out</Button></div>
      </div>
      <div className="flex gap-1 border-b">{(["orders", "addresses"] as const).map(v => (
        <button key={v} onClick={() => setView(v)} className={`px-4 py-2 text-sm border-b-2 -mb-px ${view === v ? "border-primary font-medium" : "border-transparent text-muted-foreground hover:text-foreground"}`}>{v === "orders" ? "My orders" : "Addresses"}</button>))}</div>
      {view === "orders" ? <Orders /> : <Addresses />}
    </Shell>
  );
}

export function AccountOrderPage() {
  const { orderNumber = "" } = useParams();
  const { user, loading } = useAuth();
  const [order, setOrder] = useState<PublicOrder | null>(null);
  const { data, isLoading, error } = useQuery({ queryKey: ["my-order", orderNumber], queryFn: () => api<PublicOrder>(`/me/orders/${orderNumber}`), enabled: !!user, refetchInterval: 20_000 });
  useEffect(() => { if (data) setOrder(data); }, [data]);
  if (loading) return <Shell narrow={false}><Loader2 className="h-5 w-5 animate-spin mx-auto my-16 text-muted-foreground" /></Shell>;
  if (!user) return <Navigate to={`/login?from=${encodeURIComponent(`/account/orders/${orderNumber}`)}`} replace />;
  return (
    <Shell narrow={false}>
      <Link to="/account" className="text-sm text-muted-foreground hover:text-foreground">← My orders</Link>
      {isLoading ? <Loader2 className="h-5 w-5 animate-spin mx-auto my-12 text-muted-foreground" />
        : error || !order ? <p className="text-sm text-destructive">{(error as Error)?.message ?? "Order not found"}</p>
        : <OrderView order={order} phone={user.phone ?? ""} onUpdated={setOrder} returnLink={`/returns?order=${order.orderNumber}`} />}
    </Shell>
  );
}
