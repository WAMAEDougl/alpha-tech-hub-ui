import { useEffect, useMemo, useRef, useState } from "react";
import { Link, Navigate } from "@/lib/router";
import { useQuery } from "@tanstack/react-query";
import { CheckCircle2, Loader2, Tag, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { useCart } from "@/contexts/CartContext";
import { useProducts } from "@/contexts/ProductsContext";
import { useAuth } from "@/contexts/AuthContext";
import { api, money } from "@/lib/api";
import type { PublicOrder } from "@/lib/publicOrder";
import PaymentPanel from "@/components/store/PaymentPanel";
import Header from "@/components/landing/Header";
import Footer from "@/components/landing/Footer";

type Mode = "DELIVERY" | "PICKUP";
type Method = "MPESA_MANUAL" | "MPESA_STK" | "CASH";

interface Zone { id: string; name: string; fee: number; estimatedDays: string | null }
interface Settings { mpesaManualEnabled: boolean; mpesaStkEnabled: boolean; codEnabled: boolean; paybillNumber: string | null; tillNumber: string | null; address: string | null }
interface Address { id: string; label: string; fullName: string; phone: string; area: string; addressLine: string; zoneId: string | null; isDefault: boolean }
interface Quote {
  subtotal: number; deliveryFee: number; discountAmount: number; total: number; deliveryResolved: boolean;
  deliveryZoneName: string | null; estimatedDays: string | null; discountMessage: string | null;
}

const OTHER = "__other__";
// Kenyan mobile: 07XX / 01XX / +2547XX / 2547XX
const phoneOk = (v: string) => /^(?:\+?254|0)?[17]\d{8}$/.test(v.replace(/[\s-]/g, ""));
const select = "h-10 w-full rounded-md border border-input bg-background px-3 text-sm";

const STEPS = ["Details", "Payment", "Confirmation"] as const;
function StepIndicator({ current }: { current: number }) {
  return (
    <div className="flex items-center justify-center mb-8 flex-wrap">
      {STEPS.map((label, idx) => {
        const step = idx + 1; const done = step < current; const active = step === current;
        return (
          <div key={label} className="flex items-center">
            <div className="flex flex-col items-center gap-1">
              <div className={`flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full border-2 text-sm font-semibold transition-colors ${done ? "border-primary bg-primary text-primary-foreground" : active ? "border-primary text-primary" : "border-muted-foreground/30 text-muted-foreground"}`}>
                {done ? <CheckCircle2 className="h-5 w-5" /> : step}
              </div>
              <span className={`text-xs font-medium ${active ? "text-primary" : "text-muted-foreground"}`}>{label}</span>
            </div>
            {idx < STEPS.length - 1 && <div className={`h-0.5 w-8 sm:w-16 mx-1 sm:mx-2 mb-5 transition-colors ${done ? "bg-primary" : "bg-muted-foreground/20"}`} />}
          </div>
        );
      })}
    </div>
  );
}

const CheckoutPage = () => {
  const { items, clearCart, ready } = useCart();
  const { refresh } = useProducts();
  const { user } = useAuth();
  const customer = user?.role === "CUSTOMER" ? user : null;

  const [step, setStep] = useState(1);
  const [mode, setMode] = useState<Mode>("DELIVERY");
  const [name, setName] = useState(""); const [phone, setPhone] = useState(""); const [email, setEmail] = useState("");
  const [zoneId, setZoneId] = useState(""); const [area, setArea] = useState(""); const [address, setAddress] = useState("");
  const [method, setMethod] = useState<Method | "">("");
  const [codeInput, setCodeInput] = useState(""); const [code, setCode] = useState("");
  const [touched, setTouched] = useState(false);
  const [placing, setPlacing] = useState(false); const [error, setError] = useState("");
  const [placed, setPlaced] = useState<PublicOrder | null>(null);
  const prefilled = useRef(false);

  const { data: zones } = useQuery({ queryKey: ["zones"], queryFn: () => api<Zone[]>("/zones", { auth: false }) });
  const { data: settings } = useQuery({ queryKey: ["settings"], queryFn: () => api<Settings>("/settings", { auth: false }) });
  const { data: saved } = useQuery({ queryKey: ["me-addresses"], queryFn: () => api<Address[]>("/me/addresses"), enabled: !!customer });

  // signed-in customers: start with what we already know
  useEffect(() => {
    if (!customer || prefilled.current) return;
    prefilled.current = true;
    setName(n => n || customer.name); setEmail(e => e || customer.email); setPhone(p => p || customer.phone || "");
  }, [customer]);
  useEffect(() => {
    const def = saved?.find(a => a.isDefault) ?? saved?.[0];
    if (def && !address && !zoneId && !area) applyAddress(def);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [saved]);
  function applyAddress(a: Address) {
    setName(a.fullName); setPhone(a.phone); setAddress(a.addressLine);
    if (a.zoneId && zones?.some(z => z.id === a.zoneId)) { setZoneId(a.zoneId); setArea(""); } else { setZoneId(OTHER); setArea(a.area); }
    setMode("DELIVERY");
  }

  const methods = useMemo(() => {
    const m: { key: Method; label: string; hint: string }[] = [];
    if (settings?.mpesaManualEnabled !== false) m.push({ key: "MPESA_MANUAL", label: "M-Pesa", hint: "Pay to our paybill/till, then send us the M-Pesa code. Your order is held for 24 hours." });
    if (settings?.mpesaStkEnabled) m.push({ key: "MPESA_STK", label: "M-Pesa prompt", hint: "We send a payment request to your phone." });
    if (settings?.codEnabled !== false) m.push({ key: "CASH", label: mode === "DELIVERY" ? "Cash on delivery" : "Pay at the shop", hint: mode === "DELIVERY" ? "Pay the rider when your order arrives." : "Pay when you collect your order." });
    return m;
  }, [settings, mode]);
  useEffect(() => { if (method && !methods.some(m => m.key === method)) setMethod(""); }, [methods, method]);

  // ── live price: same maths as the server ────────────────────────────────
  const quoteBody = useMemo(() => ({
    items: items.map(i => ({ productId: i.productId, quantity: i.quantity })),
    fulfillmentMode: mode,
    ...(mode === "DELIVERY" && zoneId && zoneId !== OTHER ? { deliveryZoneId: zoneId } : {}),
    ...(mode === "DELIVERY" && zoneId === OTHER && area.trim() ? { deliveryArea: area.trim() } : {}),
    ...(code ? { discountCode: code } : {}),
  }), [items, mode, zoneId, area, code]);
  const [quote, setQuote] = useState<Quote | null>(null);
  const [quoteErr, setQuoteErr] = useState("");
  useEffect(() => {
    if (!items.length) return;
    let cancelled = false;
    const t = setTimeout(() => {
      api<Quote>("/orders/quote", { auth: false, body: quoteBody })
        .then(q => { if (!cancelled) { setQuote(q); setQuoteErr(""); } })
        .catch(e => { if (!cancelled) { setQuoteErr((e as Error).message); if (code) setCode(""); } });
    }, 250);
    return () => { cancelled = true; clearTimeout(t); };
  }, [quoteBody, items.length]);

  // wait for the saved cart to load before deciding it is empty (otherwise a page reload bounces to the cart)
  if (!ready) return <div className="min-h-screen" aria-busy="true" />;
  if (items.length === 0 && !placed) return <Navigate to="/cart" replace />;

  const needZone = mode === "DELIVERY";
  const detailErrors = {
    name: name.trim().length < 2 ? "Enter your full name" : "",
    phone: !phoneOk(phone) ? "Enter a valid phone number, e.g. 0712 345 678" : "",
    email: email.trim() && !/^\S+@\S+\.\S+$/.test(email.trim()) ? "That email doesn't look right" : "",
    zone: needZone && !zoneId ? "Choose your delivery area" : needZone && zoneId === OTHER && area.trim().length < 2 ? "Tell us your town or estate" : "",
    address: needZone && address.trim().length < 5 ? "Add your street, building or landmark" : "",
  };
  const detailsOk = Object.values(detailErrors).every(v => !v);

  function applyCode() {
    const c = codeInput.trim().toUpperCase();
    if (c) { setQuoteErr(""); setCode(c); }
  }

  async function placeOrder() {
    if (placing || !method) return;
    setError(""); setPlacing(true);
    try {
      const res = await api<PublicOrder>("/orders", {
        body: {
          ...quoteBody, customerName: name.trim(), customerPhone: phone.trim(),
          customerEmail: email.trim() || undefined, paymentMethod: method,
          deliveryAddress: mode === "DELIVERY" ? address.trim() : undefined,
        },
      });
      setPlaced(res); clearCart(); refresh(); setStep(3);
    } catch (e) {
      // e.g. "Only 1 of 'Dell XPS' available": show it so the customer can fix their cart
      setError((e as Error).message || "We couldn't place your order. Please try again.");
      refresh();
    } finally { setPlacing(false); }
  }

  const err = (k: keyof typeof detailErrors) => (touched && detailErrors[k] ? <p className="text-xs text-destructive mt-1">{detailErrors[k]}</p> : null);
  const summary = (
    <div className="space-y-2 text-sm">
      {items.map(i => <div key={i.productId} className="flex justify-between gap-3"><span className="text-muted-foreground">{i.name} × {i.quantity}</span><span>{money(i.price * i.quantity)}</span></div>)}
      <div className="border-t pt-2 space-y-1">
        <div className="flex justify-between text-muted-foreground"><span>Subtotal</span><span>{money(quote?.subtotal ?? items.reduce((s, i) => s + i.price * i.quantity, 0))}</span></div>
        <div className="flex justify-between text-muted-foreground"><span>Delivery{quote?.deliveryZoneName ? ` (${quote.deliveryZoneName})` : ""}</span>
          <span>{mode === "PICKUP" ? "Free" : quote ? (quote.deliveryResolved ? money(quote.deliveryFee) : "To be confirmed") : "…"}</span></div>
        {!!quote?.discountAmount && <div className="flex justify-between text-green-600 dark:text-green-400"><span>Discount</span><span>-{money(quote.discountAmount)}</span></div>}
        <div className="flex justify-between font-semibold text-base pt-1"><span>Total</span><span>{quote ? money(quote.total) : "…"}</span></div>
      </div>
      {mode === "DELIVERY" && quote && !quote.deliveryResolved && <p className="text-xs text-muted-foreground">We&apos;ll call you to agree the delivery fee for your area before we continue.</p>}
    </div>
  );

  return (
    <div className="min-h-screen">
      <Header />
      <main className="pt-16">
        <div className="container mx-auto px-6 lg:px-10 py-10 max-w-xl">
          <h1 className="text-3xl font-bold mb-6 text-center">Checkout</h1>
          <StepIndicator current={step} />

          {step === 1 && (
            <Card>
              <CardHeader><CardTitle>How would you like to get your order?</CardTitle></CardHeader>
              <CardContent className="flex flex-col gap-5">
                {customer && saved && saved.length > 0 && (
                  <div className="space-y-1.5"><Label>Use a saved address</Label>
                    <select className={select} defaultValue="" onChange={e => { const a = saved.find(x => x.id === e.target.value); if (a) applyAddress(a); }}>
                      <option value="">Choose…</option>{saved.map(a => <option key={a.id} value={a.id}>{a.label} · {a.addressLine}</option>)}
                    </select></div>
                )}
                <RadioGroup value={mode} onValueChange={v => setMode(v as Mode)} className="flex flex-col gap-3">
                  <div className="flex items-center gap-3 rounded-lg border p-4 cursor-pointer hover:bg-muted/50"><RadioGroupItem value="DELIVERY" id="delivery" /><Label htmlFor="delivery" className="cursor-pointer font-medium">Home delivery</Label></div>
                  <div className="flex items-center gap-3 rounded-lg border p-4 cursor-pointer hover:bg-muted/50"><RadioGroupItem value="PICKUP" id="pickup" /><Label htmlFor="pickup" className="cursor-pointer font-medium">In-store pickup (Nanyuki){settings?.address ? <span className="block text-xs font-normal text-muted-foreground">{settings.address}</span> : null}</Label></div>
                </RadioGroup>

                <div className="space-y-4">
                  <div className="space-y-1.5"><Label htmlFor="name">Full name</Label><Input id="name" autoComplete="name" value={name} onChange={e => setName(e.target.value)} />{err("name")}</div>
                  <div className="space-y-1.5"><Label htmlFor="phone">Phone number</Label><Input id="phone" type="tel" autoComplete="tel" placeholder="0712 345 678" value={phone} onChange={e => setPhone(e.target.value)} />{err("phone")}
                    <p className="text-xs text-muted-foreground">We use this to confirm your order and for the rider.</p></div>
                  <div className="space-y-1.5"><Label htmlFor="email">Email <span className="text-muted-foreground font-normal">(optional, for order updates)</span></Label><Input id="email" type="email" autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} />{err("email")}</div>
                  {mode === "DELIVERY" && (<>
                    <div className="space-y-1.5"><Label htmlFor="zone">Delivery area</Label>
                      <select id="zone" className={select} value={zoneId} onChange={e => setZoneId(e.target.value)}>
                        <option value="">Choose your area…</option>
                        {zones?.map(z => <option key={z.id} value={z.id}>{z.name} · {money(z.fee)}{z.estimatedDays ? ` · ${z.estimatedDays}` : ""}</option>)}
                        <option value={OTHER}>My area isn&apos;t listed</option>
                      </select>{err("zone")}</div>
                    {zoneId === OTHER && <div className="space-y-1.5"><Label htmlFor="area">Your town or estate</Label><Input id="area" value={area} onChange={e => setArea(e.target.value)} placeholder="e.g. Timau" />
                      <p className="text-xs text-muted-foreground">We&apos;ll call you to agree the delivery fee.</p></div>}
                    <div className="space-y-1.5"><Label htmlFor="addr">Street, building or landmark</Label><Input id="addr" autoComplete="street-address" value={address} onChange={e => setAddress(e.target.value)} placeholder="e.g. Kenyatta Ave, next to Total petrol station" />{err("address")}</div>
                  </>)}
                </div>
                <Button className="w-full" onClick={() => { setTouched(true); if (detailsOk) { setStep(2); window.scrollTo({ top: 0 }); } }}>Continue to payment</Button>
              </CardContent>
            </Card>
          )}

          {step === 2 && (
            <div className="flex flex-col gap-6">
              <Card>
                <CardHeader><CardTitle>Payment method</CardTitle></CardHeader>
                <CardContent className="flex flex-col gap-4">
                  {methods.length === 0 && <p className="text-sm text-destructive">No payment method is available right now. Please contact us.</p>}
                  <RadioGroup value={method} onValueChange={v => setMethod(v as Method)} className="flex flex-col gap-3">
                    {methods.map(m => (
                      <div key={m.key} className="flex items-start gap-3 rounded-lg border p-4 cursor-pointer hover:bg-muted/50">
                        <RadioGroupItem value={m.key} id={m.key} className="mt-0.5" />
                        <Label htmlFor={m.key} className="cursor-pointer font-medium">{m.label}<span className="block text-xs font-normal text-muted-foreground">{m.hint}</span></Label>
                      </div>
                    ))}
                  </RadioGroup>
                </CardContent>
              </Card>

              <Card>
                <CardHeader><CardTitle>Order summary</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  {!quote?.discountMessage ? (
                    <div className="flex gap-2">
                      <div className="relative flex-1"><Tag className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input className="pl-9 uppercase" placeholder="Discount code" value={codeInput} onChange={e => setCodeInput(e.target.value.toUpperCase())} onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); applyCode(); } }} /></div>
                      <Button variant="outline" onClick={applyCode} disabled={!codeInput.trim()}>Apply</Button>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between rounded-md bg-green-500/10 px-3 py-2 text-sm text-green-700 dark:text-green-400"><span>{quote.discountMessage}</span>
                      <button aria-label="Remove discount code" onClick={() => { setCode(""); setCodeInput(""); }}><X className="h-4 w-4" /></button></div>
                  )}
                  {quoteErr && <p role="alert" className="text-sm text-destructive">{quoteErr}</p>}
                  {summary}
                </CardContent>
              </Card>

              {error && <p role="alert" className="text-sm text-destructive bg-destructive/10 rounded-md px-3 py-2">{error} <Link to="/cart" className="underline">Edit cart</Link></p>}
              <div className="flex gap-3">
                <Button variant="outline" className="flex-1" onClick={() => { setError(""); setStep(1); }} disabled={placing}>Back</Button>
                <Button className="flex-1" onClick={placeOrder} disabled={placing || !method || !quote || !!quoteErr}>{placing && <Loader2 className="h-4 w-4 animate-spin" />} {placing ? "Placing order…" : "Place order"}</Button>
              </div>
            </div>
          )}

          {step === 3 && placed && (
            <div className="flex flex-col gap-5">
              <Card><CardContent className="flex flex-col items-center gap-3 py-8 text-center">
                <CheckCircle2 className="h-14 w-14 text-green-500" />
                <h2 className="text-2xl font-bold">Order placed!</h2>
                <p className="text-sm text-muted-foreground">Thank you, {name.split(" ")[0]}. We&apos;ll keep you updated on {phone}{email ? ` and ${email}` : ""}.</p>
                <div className="w-full rounded-lg bg-muted/50 p-3"><p className="text-xs uppercase tracking-wider text-muted-foreground">Order number</p><p className="text-xl font-mono font-bold">{placed.orderNumber}</p></div>
                <p className="text-sm">Total: <b>{money(placed.totalAmount)}</b>{placed.deliveryResolved || placed.pickup ? "" : " + delivery (we'll call you to agree it)"}</p>
              </CardContent></Card>
              <PaymentPanel order={placed} phone={phone} onUpdated={setPlaced} />
              <div className="flex flex-col sm:flex-row gap-3">
                <Button asChild variant="outline" className="flex-1"><Link to={`/track?order=${placed.orderNumber}`}>Track this order</Link></Button>
                <Button asChild className="flex-1"><Link to="/">Back to home</Link></Button>
              </div>
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default CheckoutPage;
