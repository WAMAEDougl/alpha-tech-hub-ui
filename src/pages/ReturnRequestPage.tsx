import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { CheckCircle2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import Header from "@/components/landing/Header";
import Footer from "@/components/landing/Footer";

interface Eligibility {
  orderNumber: string; eligible: boolean; reason: string | null; windowDays: number; deadline?: string;
  items: { orderItemId: string; name: string; bought: number; returnable: number }[];
}

/** Customers ask to return something they received. The shop approves it, then inspects the goods. */
const ReturnRequestPage = () => {
  const [params] = useSearchParams();
  const { user } = useAuth();
  const [orderNumber, setOrderNumber] = useState(params.get("order") ?? "");
  const [phone, setPhone] = useState("");
  const [elig, setElig] = useState<Eligibility | null>(null);
  const [qty, setQty] = useState<Record<string, number>>({});
  const [reason, setReason] = useState("");
  const [resolution, setResolution] = useState<"REFUND" | "EXCHANGE">("REFUND");
  const [busy, setBusy] = useState(false); const [error, setError] = useState(""); const [done, setDone] = useState(false);
  // one id per request: a double-tap or retry can never create two returns
  const [requestRef] = useState(() => crypto.randomUUID());

  async function lookup(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true); setError("");
    try {
      setElig(await api<Eligibility>(`/returns/eligibility?orderNumber=${encodeURIComponent(orderNumber.trim())}${phone ? `&phone=${encodeURIComponent(phone.trim())}` : ""}`));
      setQty({});
    } catch (err) { setElig(null); setError((err as Error).message); }
    finally { setBusy(false); }
  }

  async function submit() {
    if (!elig || busy) return;
    const items = Object.entries(qty).filter(([, q]) => q > 0).map(([orderItemId, quantity]) => ({ orderItemId, quantity }));
    setBusy(true); setError("");
    try {
      await api("/returns", { body: { orderNumber: elig.orderNumber, phone: phone || undefined, items, reason: reason.trim(), resolution, requestRef } });
      setDone(true);
    } catch (err) { setError((err as Error).message); }
    finally { setBusy(false); }
  }

  const chosen = Object.values(qty).some(q => q > 0);
  return (
    <div className="min-h-screen">
      <Header />
      <main className="pt-16"><div className="container mx-auto px-6 lg:px-10 py-10 max-w-xl space-y-6">
        <h1 className="text-3xl font-bold text-center">Return an item</h1>
        {done ? (
          <Card><CardContent className="py-10 flex flex-col items-center gap-3 text-center">
            <CheckCircle2 className="h-14 w-14 text-green-500" />
            <h2 className="text-xl font-bold">Return requested</h2>
            <p className="text-sm text-muted-foreground max-w-sm">We&apos;ll review it and contact you about the next step. Please keep the item and its packaging until we do.</p>
            <Button asChild><Link to="/">Back to home</Link></Button>
          </CardContent></Card>
        ) : !elig ? (
          <Card><CardContent className="p-5">
            <form onSubmit={lookup} className="space-y-4">
              <div className="space-y-1.5"><Label htmlFor="on">Order number</Label><Input id="on" value={orderNumber} onChange={e => setOrderNumber(e.target.value.toUpperCase())} placeholder="AC-261124-ABCD" required /></div>
              {!user && <div className="space-y-1.5"><Label htmlFor="ph">Phone number used for the order</Label><Input id="ph" type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="0712 345 678" required /></div>}
              {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
              <Button type="submit" className="w-full" disabled={busy || !orderNumber || (!user && !phone)}>{busy && <Loader2 className="h-4 w-4 animate-spin" />} Find my order</Button>
            </form>
          </CardContent></Card>
        ) : !elig.eligible ? (
          <Card><CardContent className="p-6 space-y-3 text-center"><p className="text-sm">{elig.reason}</p><Button variant="outline" onClick={() => setElig(null)}>Try another order</Button></CardContent></Card>
        ) : (
          <Card><CardContent className="p-5 space-y-5">
            <div><p className="font-mono font-semibold">{elig.orderNumber}</p><p className="text-xs text-muted-foreground">Returns are open for {elig.windowDays} days after delivery{elig.deadline ? `, until ${new Date(elig.deadline).toLocaleDateString("en-KE")}` : ""}.</p></div>
            <div className="space-y-3">
              <p className="text-sm font-medium">What would you like to return?</p>
              {elig.items.map(i => (
                <div key={i.orderItemId} className="flex items-center justify-between gap-3 text-sm">
                  <span className={i.returnable === 0 ? "text-muted-foreground" : ""}>{i.name}<span className="block text-xs text-muted-foreground">Bought {i.bought}{i.returnable < i.bought ? ` · ${i.returnable} can still be returned` : ""}</span></span>
                  <Input type="number" min={0} max={i.returnable} disabled={i.returnable === 0} className="w-20" aria-label={`Quantity of ${i.name} to return`} value={qty[i.orderItemId] ?? 0}
                    onChange={e => setQty(q => ({ ...q, [i.orderItemId]: Math.max(0, Math.min(i.returnable, Number(e.target.value) || 0)) }))} />
                </div>
              ))}
            </div>
            <div className="space-y-1.5"><Label htmlFor="why">Why are you returning it?</Label><Input id="why" value={reason} onChange={e => setReason(e.target.value)} placeholder="e.g. Screen has dead pixels" /></div>
            <div className="space-y-2"><p className="text-sm font-medium">What would you prefer?</p>
              <div className="flex gap-2">{([["REFUND", "Refund my money"], ["EXCHANGE", "Exchange for another"]] as const).map(([k, l]) => (
                <button key={k} type="button" onClick={() => setResolution(k)} className={`flex-1 text-sm rounded-md border px-3 py-2 ${resolution === k ? "border-primary bg-primary/10 font-medium" : "hover:bg-muted"}`}>{l}</button>))}</div>
              <p className="text-xs text-muted-foreground">{resolution === "REFUND" ? "After we receive and check the item, we send your money back the way you paid." : "After we receive and check the item, we arrange a replacement with you."}</p></div>
            {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
            <div className="flex gap-3"><Button variant="outline" onClick={() => setElig(null)} disabled={busy}>Back</Button>
              <Button className="flex-1" disabled={busy || !chosen || reason.trim().length < 3} onClick={submit}>{busy && <Loader2 className="h-4 w-4 animate-spin" />} Request return</Button></div>
          </CardContent></Card>
        )}
      </div></main>
      <Footer />
    </div>
  );
};

export default ReturnRequestPage;
