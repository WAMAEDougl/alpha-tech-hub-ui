import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { api, money } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { ago, fmtDate } from "./orderTypes";

interface RetRow { id: string; orderNumber: string; customerName: string; kind: "CUSTOMER" | "CANCELLED_DISPATCH"; status: string; reason: string | null; resolution: "REFUND" | "EXCHANGE"; refundAmount: number | null; createdAt: string; units: number; received: number }
interface RetItem { id: string; name: string; unitPrice: number; quantity: number; received: number; restocked: number; held: number }
interface Ret {
  id: string; orderNumber: string; customerName: string; customerPhone: string; orderTotal: number; kind: "CUSTOMER" | "CANCELLED_DISPATCH";
  status: "REQUESTED" | "APPROVED" | "REJECTED" | "RECEIVED" | "REFUNDED" | "CLOSED"; reason: string | null; decisionNote: string | null; resolution: "REFUND" | "EXCHANGE";
  refundAmount: number | null; refundNote: string | null; refundReference: string | null; refundedAt: string | null; createdAt: string; items: RetItem[];
  refund: { paid: boolean; paymentMethod: string; alreadyRefundedOnOrder: number; maxRefundable: number; suggested: number; canRefund: boolean; blockedReason: string | null };
}

const FILTERS = [["", "All"], ["REQUESTED", "To decide"], ["APPROVED", "Awaiting goods"], ["RECEIVED", "Received, to refund"], ["REFUNDED", "Refunded"], ["REJECTED", "Rejected"]] as const;
const kindLabel = (k: string) => (k === "CANCELLED_DISPATCH" ? "Failed delivery" : "Customer return");
const statusText: Record<string, string> = { REQUESTED: "Needs a decision", APPROVED: "Awaiting goods", RECEIVED: "Goods received", REFUNDED: "Refunded", REJECTED: "Rejected", CLOSED: "Closed" };

export function ReturnsList() {
  const [status, setStatus] = useState("");
  const { data, isLoading, error } = useQuery({ queryKey: ["returns", status], queryFn: () => api<RetRow[]>(`/returns${status ? `?status=${status}` : ""}`), refetchInterval: 30_000 });
  return (
    <div className="space-y-5">
      <div><h1 className="text-2xl font-heading font-bold">Returns</h1>
        <p className="text-sm text-muted-foreground">Customer returns and failed deliveries. The office decides; inventory receives and inspects the goods.</p></div>
      <div className="flex flex-wrap gap-2">
        {FILTERS.map(([v, l]) => <Button key={v} size="sm" variant={status === v ? "default" : "outline"} onClick={() => setStatus(v)}>{l}</Button>)}
      </div>
      {isLoading ? <Loader2 className="h-5 w-5 animate-spin mx-auto my-12 text-muted-foreground" />
        : error ? <p className="text-sm text-destructive">{(error as Error).message}</p>
        : !data?.length ? <Card><CardContent className="p-10 text-center text-sm text-muted-foreground">No returns here.</CardContent></Card>
        : (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {data.map(r => (
              <Link key={r.id} to={`/admin/returns/${r.id}`}>
                <Card className="h-full hover:border-primary/50 transition-colors"><CardContent className="p-4 space-y-1.5">
                  <div className="flex justify-between text-xs"><span className="font-mono">{r.orderNumber}</span><span className="text-muted-foreground">{ago(r.createdAt)}</span></div>
                  <p className="font-medium text-sm">{r.customerName}</p>
                  <p className="text-xs text-muted-foreground line-clamp-2">{r.reason}</p>
                  <div className="flex justify-between items-center pt-1"><Badge variant="outline">{kindLabel(r.kind)}{r.kind === "CUSTOMER" && r.resolution === "EXCHANGE" ? " · exchange" : ""}</Badge><span className="text-xs">{r.status === "REFUNDED" && r.refundAmount !== null ? `Refunded ${money(r.refundAmount)}` : statusText[r.status]} · {r.received}/{r.units} back</span></div>
                </CardContent></Card>
              </Link>
            ))}
          </div>
        )}
    </div>
  );
}

export function ReturnDetail() {
  const { returnId = "" } = useParams();
  const { user } = useAuth(); const { toast } = useToast(); const qc = useQueryClient();
  const office = user?.role === "ADMIN";
  const { data: r, isLoading, error } = useQuery({ queryKey: ["return", returnId], queryFn: () => api<Ret>(`/returns/${returnId}`) });
  const [note, setNote] = useState("");
  const [insp, setInsp] = useState<Record<string, { rec: string; sell: string }>>({});
  const [refund, setRefund] = useState<string | null>(null); const [refundNote, setRefundNote] = useState(""); const [refundRef, setRefundRef] = useState(""); const [confirming, setConfirming] = useState(false);

  const done = (res: Ret) => { qc.setQueryData(["return", returnId], res); qc.invalidateQueries({ queryKey: ["returns"] }); qc.invalidateQueries({ queryKey: ["inventory"] }); setInsp({}); };
  const fail = (e: Error) => toast({ title: "That didn't go through", description: e.message, variant: "destructive" });
  const decide = useMutation({ mutationFn: (approve: boolean) => api<Ret>(`/returns/${returnId}/decision`, { body: { approve, note: note.trim() || undefined } }), onSuccess: done, onError: fail });
  const inspect = useMutation({
    mutationFn: () => api<Ret>(`/returns/${returnId}/inspect`, { body: { items: Object.entries(insp).map(([returnItemId, v]) => ({ returnItemId, receivedQuantity: Number(v.rec), sellableQuantity: Number(v.sell) })) } }),
    onSuccess: res => { done(res); toast({ title: "Inspection saved", description: "Sellable items are back on the shelf." }); }, onError: fail,
  });
  const record = useMutation({
    mutationFn: (amount: number) => api<Ret>(`/returns/${returnId}/refund`, { body: { amount, note: refundNote.trim() || undefined, reference: refundRef.trim() || undefined } }),
    onSuccess: res => { done(res); setConfirming(false); toast({ title: "Refund recorded", description: "The customer has been told." }); },
    onError: (e: Error) => { setConfirming(false); fail(e); },
  });

  if (isLoading) return <Loader2 className="h-5 w-5 animate-spin mx-auto my-12 text-muted-foreground" />;
  if (error || !r) return <p className="text-sm text-destructive">{(error as Error)?.message ?? "Return not found"}</p>;
  const dirty = Object.keys(insp).length > 0;
  const goodsOutstanding = r.items.some(i => i.received < i.quantity);
  const inspectable = ["APPROVED", "RECEIVED", "REFUNDED"].includes(r.status) && (r.status !== "RECEIVED" || goodsOutstanding) && (r.status !== "REFUNDED" || goodsOutstanding || dirty);
  const val = (i: RetItem) => insp[i.id] ?? { rec: String(i.received), sell: String(i.restocked) };

  return (
    <div className="space-y-5 max-w-3xl">
      <Link to="/admin/returns" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" /> All returns</Link>
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-heading font-bold">{kindLabel(r.kind)}</h1>
        <Badge variant="outline">{statusText[r.status]}</Badge>
        <Link to="/admin/orders" className="font-mono text-sm underline" onClick={e => e.stopPropagation()}>{r.orderNumber}</Link>
        <span className="text-sm text-muted-foreground">{r.customerName} · {r.customerPhone} · {fmtDate(r.createdAt)}</span>
      </div>
      {r.reason && <Card><CardContent className="p-4 text-sm"><span className="text-muted-foreground">Reason: </span>{r.reason}</CardContent></Card>}

      {r.status === "REQUESTED" && (
        <Card className="border-primary/40"><CardContent className="p-5 space-y-3">
          <p className="font-medium">The customer is asking to return these items</p>
          {office ? (<>
            <div className="space-y-1.5"><Label>Note to the customer / team (required if rejecting)</Label><Input value={note} onChange={e => setNote(e.target.value)} /></div>
            <div className="flex gap-2"><Button disabled={decide.isPending} onClick={() => decide.mutate(true)}>Approve return</Button>
              <Button variant="outline" className="text-destructive" disabled={decide.isPending || note.trim().length < 3} onClick={() => decide.mutate(false)}>Reject</Button></div>
          </>) : <p className="text-sm text-muted-foreground">Waiting for the office to approve this return.</p>}
        </CardContent></Card>
      )}
      {r.decisionNote && <p className="text-sm text-muted-foreground">Decision note: {r.decisionNote}</p>}

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-base">Goods</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          {r.items.map(i => {
            const v = val(i);
            return (
              <div key={i.id} className="space-y-2 border-b pb-4 last:border-0 last:pb-0">
                <div className="flex justify-between gap-3 text-sm"><span className="font-medium">{i.quantity} × {i.name}</span><span className="text-muted-foreground">{money(i.unitPrice * i.quantity)}</span></div>
                <p className="text-xs text-muted-foreground">Received {i.received}/{i.quantity} · {i.restocked} back on shelf · {i.held} held aside (damaged / not yet checked)</p>
                {inspectable && (
                  <div className="flex flex-wrap items-end gap-3">
                    <div className="space-y-1"><Label className="text-xs">Received so far</Label><Input type="number" min={i.received} max={i.quantity} className="w-24 h-9" value={v.rec} onChange={e => setInsp(s => ({ ...s, [i.id]: { ...v, rec: e.target.value } }))} /></div>
                    <div className="space-y-1"><Label className="text-xs">Of those, sellable</Label><Input type="number" min={i.restocked} max={Number(v.rec)} className="w-24 h-9" value={v.sell} onChange={e => setInsp(s => ({ ...s, [i.id]: { ...v, sell: e.target.value } }))} /></div>
                  </div>
                )}
              </div>
            );
          })}
          {inspectable && (
            <div className="space-y-1"><Button disabled={!dirty || inspect.isPending} onClick={() => inspect.mutate()}>{inspect.isPending && <Loader2 className="h-4 w-4 animate-spin" />} Save inspection</Button>
              <p className="text-xs text-muted-foreground">Enter running totals. Saving again can never put the same item on the shelf twice. Damaged goods stay held aside.</p></div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-base">Refund</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {r.kind === "CUSTOMER" && <p className="text-sm text-muted-foreground">The customer asked for: <b className="text-foreground">{r.resolution === "EXCHANGE" ? "an exchange" : "their money back"}</b></p>}

          {r.status === "REFUNDED" && r.refundAmount !== null && (
            <div className="rounded-lg bg-green-500/10 p-3 text-sm space-y-0.5">
              <p className="font-medium text-green-700 dark:text-green-400">Refunded {money(r.refundAmount)}{r.refundedAt ? ` on ${fmtDate(r.refundedAt)}` : ""}</p>
              {r.refundReference && <p className="text-xs">Reference: <span className="font-mono">{r.refundReference}</span></p>}
              {r.refundNote && <p className="text-xs text-muted-foreground">{r.refundNote}</p>}
              <p className="text-xs text-muted-foreground">The customer was notified.</p>
            </div>
          )}

          {r.refund.alreadyRefundedOnOrder > 0 && <p className="text-xs text-muted-foreground">{money(r.refund.alreadyRefundedOnOrder)} has already been refunded on this order by another return.</p>}

          {r.refund.blockedReason && r.status !== "REFUNDED" && <p className="text-sm text-muted-foreground">{r.refund.blockedReason}</p>}

          {office && r.refund.canRefund && (
            <div className="space-y-3">
              <p className="text-xs text-muted-foreground">This only records a refund you paid out yourself (M-Pesa, cash...). It doesn&apos;t send money or change stock. Suggested amount is the value of the returned goods at the price paid (less any discount).</p>
              <div className="flex flex-wrap items-end gap-3">
                <div className="space-y-1"><Label className="text-xs">Amount (KES, max {money(r.refund.maxRefundable)})</Label>
                  <Input type="number" min={1} max={r.refund.maxRefundable} className="w-36" value={refund ?? String(r.refund.suggested)} onChange={e => { setRefund(e.target.value); setConfirming(false); }} /></div>
                <div className="space-y-1"><Label className="text-xs">M-Pesa code / receipt no.</Label><Input className="w-44 font-mono uppercase" value={refundRef} onChange={e => setRefundRef(e.target.value.toUpperCase())} placeholder="optional" /></div>
                <div className="space-y-1 flex-1 min-w-40"><Label className="text-xs">Note</Label><Input value={refundNote} onChange={e => setRefundNote(e.target.value)} placeholder="e.g. Sent to the number they paid from" /></div>
              </div>
              {(() => {
                const amt = Number(refund ?? r.refund.suggested);
                const bad = !(amt > 0) || amt > r.refund.maxRefundable;
                return confirming ? (
                  <div className="flex flex-wrap items-center gap-3 rounded-md border border-amber-500/50 p-3 text-sm">
                    <span>Record a refund of <b>{money(amt)}</b> to {r.customerName}? The customer will be messaged and it can&apos;t be undone.</span>
                    <Button size="sm" disabled={record.isPending || bad} onClick={() => record.mutate(amt)}>{record.isPending && <Loader2 className="h-4 w-4 animate-spin" />} Yes, record it</Button>
                    <Button size="sm" variant="ghost" onClick={() => setConfirming(false)}>Back</Button>
                  </div>
                ) : <Button variant="outline" disabled={bad} onClick={() => setConfirming(true)}>Record refund</Button>;
              })()}
            </div>
          )}
          {!office && r.refund.canRefund && <p className="text-sm text-muted-foreground">The office records refunds once the goods are checked.</p>}
        </CardContent>
      </Card>
    </div>
  );
}
