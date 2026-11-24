import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { CheckCircle2, Clock, Copy, Loader2, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api, money } from "@/lib/api";
import type { PublicOrder } from "@/lib/publicOrder";

/**
 * Tells the customer exactly how to pay by M-Pesa and lets them send the confirmation code.
 * The shop verifies the code against its statement, so a wrong or reused code is rejected, not trusted.
 */
export default function PaymentPanel({ order, phone, onUpdated }: { order: PublicOrder; phone: string; onUpdated: (o: PublicOrder) => void }) {
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const stk = order.paymentMethod === "MPESA_STK";

  const submit = useMutation({
    mutationFn: () => api<PublicOrder>("/orders/payment-reference", { auth: false, body: { orderNumber: order.orderNumber, phone, code: code.trim() } }),
    onSuccess: o => { setError(""); setCode(""); onUpdated(o); },
    onError: (e: Error) => setError(e.message),
  });
  const prompt = useMutation({
    mutationFn: () => api<{ message: string }>("/payments/mpesa/stk", { auth: false, body: { orderNumber: order.orderNumber, phone } }),
    onError: (e: Error) => setError(e.message),
  });

  if (order.payment.awaitingVerification) {
    return (
      <div className="rounded-lg border bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800 p-4 flex gap-3">
        <Clock className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
        <div className="text-sm space-y-1">
          <p className="font-medium">We&apos;re checking your payment</p>
          <p className="text-muted-foreground">You sent code <span className="font-mono font-semibold text-foreground">{order.payment.submittedCode}</span>. We&apos;ll confirm it shortly. This page updates when we do.</p>
          <button className="text-xs underline text-muted-foreground" onClick={() => onUpdated({ ...order, payment: { ...order.payment, awaitingVerification: false, canSubmitCode: true } })}>Entered the wrong code?</button>
        </div>
      </div>
    );
  }
  if (!order.payment.canSubmitCode) return null;
  const ins = order.payment.instructions;
  const where = ins?.paybill ? `Paybill ${ins.paybill}` : ins?.till ? `Till ${ins.till}` : null;

  return (
    <div className="rounded-lg border p-4 space-y-4">
      <div className="flex items-center gap-2 font-medium"><Smartphone className="h-4 w-4 text-primary" /> Pay by M-Pesa</div>
      {stk && (
        <div className="space-y-2">
          <Button size="sm" onClick={() => prompt.mutate()} disabled={prompt.isPending}>{prompt.isPending && <Loader2 className="h-4 w-4 animate-spin" />} Send the payment prompt to my phone</Button>
          {prompt.isSuccess && <p className="text-sm text-green-600 dark:text-green-400"><CheckCircle2 className="inline h-4 w-4" /> {prompt.data.message}</p>}
        </div>
      )}
      {where ? (
        <ol className="text-sm space-y-1.5 list-decimal pl-5">
          <li>Open M-Pesa, choose <b>Lipa na M-Pesa</b>{ins?.paybill ? " → Paybill" : " → Buy Goods (Till)"}.</li>
          <li>{ins?.paybill ? "Business number" : "Till number"}: <b className="font-mono">{ins?.paybill ?? ins?.till}</b>{ins?.paybill && <> · Account: <b className="font-mono">{ins.account}</b> <button type="button" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground align-middle" onClick={() => { navigator.clipboard?.writeText(ins.account).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1500); }).catch(() => undefined); }}><Copy className="h-3 w-3" />{copied ? "copied" : "copy"}</button></>}</li>
          <li>Amount: <b>{money(ins?.amount ?? order.totalAmount)}</b></li>
          <li>Enter your PIN. M-Pesa texts you a confirmation code.</li>
          <li>Type that code below so we can confirm your payment.</li>
        </ol>
      ) : (
        <p className="text-sm text-muted-foreground">We&apos;ll contact you with M-Pesa payment details for {money(order.totalAmount)}. If you&apos;ve already paid, enter the M-Pesa code below.</p>
      )}
      <form className="space-y-2" onSubmit={e => { e.preventDefault(); if (code.trim().length >= 10 && !submit.isPending) submit.mutate(); }}>
        <Label htmlFor="mpesa-code">M-Pesa confirmation code</Label>
        <div className="flex gap-2">
          <Input id="mpesa-code" className="font-mono uppercase" maxLength={12} placeholder="e.g. SGH7K2L9QX" autoComplete="off" value={code} onChange={e => setCode(e.target.value.toUpperCase())} />
          <Button type="submit" disabled={code.trim().length < 10 || submit.isPending}>{submit.isPending && <Loader2 className="h-4 w-4 animate-spin" />} Submit</Button>
        </div>
        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
        <p className="text-xs text-muted-foreground">Your order is held for 24 hours while we wait for payment.</p>
      </form>
    </div>
  );
}
