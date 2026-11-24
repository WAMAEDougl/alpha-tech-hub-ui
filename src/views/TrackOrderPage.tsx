import { useEffect, useState } from "react";
import { useSearchParams } from "@/lib/router";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api } from "@/lib/api";
import type { PublicOrder } from "@/lib/publicOrder";
import OrderView from "@/components/store/OrderView";
import Header from "@/components/landing/Header";
import Footer from "@/components/landing/Footer";

const REFRESH_MS = 20_000;

const TrackOrderPage = () => {
  const [params] = useSearchParams();
  const [orderNumber, setOrderNumber] = useState(params.get("order") ?? "");
  const [phone, setPhone] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [order, setOrder] = useState<PublicOrder | null>(null);
  const [looked, setLooked] = useState<{ n: string; p: string } | null>(null);

  async function fetchOrder(n: string, p: string, silent = false) {
    if (!silent) { setBusy(true); setError(""); }
    try {
      setOrder(await api<PublicOrder>(`/orders/track?orderNumber=${encodeURIComponent(n.trim())}&phone=${encodeURIComponent(p.trim())}`, { auth: false }));
      setLooked({ n, p });
    } catch (err) {
      if (!silent) { setOrder(null); setLooked(null); setError((err as Error).message || "Could not find that order."); }
    } finally {
      if (!silent) setBusy(false);
    }
  }

  // keep the page current: payment confirmed, packed, out for delivery… without a refresh
  useEffect(() => {
    if (!looked) return;
    const id = setInterval(() => { if (!document.hidden) fetchOrder(looked.n, looked.p, true); }, REFRESH_MS);
    return () => clearInterval(id);
  }, [looked]);

  return (
    <div className="min-h-screen">
      <Header />
      <main className="pt-16">
        <div className="container mx-auto px-6 lg:px-10 py-10 max-w-xl space-y-6">
          <h1 className="text-3xl font-bold text-center">Track your order</h1>
          {!order && (
            <Card><CardContent className="p-5">
              <form onSubmit={e => { e.preventDefault(); if (!busy) fetchOrder(orderNumber, phone); }} className="space-y-4">
                <div className="space-y-1.5"><Label htmlFor="on">Order number</Label>
                  <Input id="on" value={orderNumber} onChange={e => setOrderNumber(e.target.value.toUpperCase())} placeholder="AC-261124-ABCD" required /></div>
                <div className="space-y-1.5"><Label htmlFor="ph">Phone number used for the order</Label>
                  <Input id="ph" type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="0712 345 678" required /></div>
                {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
                <Button type="submit" className="w-full" disabled={busy || !orderNumber || !phone}>{busy && <Loader2 className="h-4 w-4 animate-spin" />} Track order</Button>
              </form>
            </CardContent></Card>
          )}
          {order && (
            <>
              <OrderView order={order} phone={phone} onUpdated={setOrder} returnLink={`/returns?order=${order.orderNumber}`} />
              <div className="text-center"><button className="text-sm text-muted-foreground underline" onClick={() => { setOrder(null); setLooked(null); }}>Track a different order</button></div>
            </>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default TrackOrderPage;
