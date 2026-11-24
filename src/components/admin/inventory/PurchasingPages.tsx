import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { api, money } from "@/lib/api";

interface Supplier { id: string; name: string; phone: string | null; email: string | null; notes: string | null; isActive: boolean }
interface PoItem { id: string; productId: string; name: string; sku: string; quantity: number; received: number; unitCost: number | null }
interface Po { id: string; number: string; status: "DRAFT" | "ORDERED" | "PARTIAL" | "RECEIVED" | "CANCELLED"; notes: string | null; createdAt: string; supplier: { id: string; name: string }; items: PoItem[]; total: number }
interface Suggestion { productId: string; name: string; sku: string; available: number; reorderLevel: number; demand: number; shortfall: number; suggested: number; costPrice: number | null }

const select = "h-10 w-full rounded-md border border-input bg-background px-3 text-sm";
const poChip: Record<Po["status"], string> = {
  DRAFT: "bg-muted text-muted-foreground", ORDERED: "bg-sky-500/15 text-sky-600 dark:text-sky-400",
  PARTIAL: "bg-amber-500/15 text-amber-600 dark:text-amber-400", RECEIVED: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400", CANCELLED: "bg-destructive/15 text-destructive",
};

const useSuppliers = () => useQuery({ queryKey: ["suppliers"], queryFn: () => api<Supplier[]>("/inventory/suppliers") });

// ── Suppliers ──────────────────────────────────────────────────────────────

export function SuppliersPage() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { data, isLoading, error } = useSuppliers();
  const [adding, setAdding] = useState(false);
  const toggle = useMutation({
    mutationFn: (v: { id: string; isActive: boolean }) => api(`/inventory/suppliers/${v.id}`, { method: "PATCH", body: { isActive: v.isActive } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["suppliers"] }),
    onError: (e: Error) => toast({ title: "Couldn't update", description: e.message, variant: "destructive" }),
  });
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between"><p className="text-sm text-muted-foreground">People you buy from. Used on purchase orders and when receiving goods for a customer order.</p>
        <Button onClick={() => setAdding(true)}><Plus className="h-4 w-4" /> Add supplier</Button></div>
      <Card><CardContent className="p-0">
        {isLoading ? <Loader2 className="h-5 w-5 animate-spin mx-auto my-12 text-muted-foreground" />
          : error ? <p className="p-6 text-sm text-destructive">{(error as Error).message}</p>
          : !data?.length ? <p className="p-8 text-center text-sm text-muted-foreground">No suppliers yet.</p>
          : (
            <Table><TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Contact</TableHead><TableHead>Notes</TableHead><TableHead>Active</TableHead></TableRow></TableHeader>
              <TableBody>{data.map(s => (
                <TableRow key={s.id}>
                  <TableCell className="font-medium">{s.name}</TableCell>
                  <TableCell className="text-sm">{s.phone}{s.phone && s.email ? " · " : ""}{s.email}</TableCell>
                  <TableCell className="text-sm text-muted-foreground max-w-xs truncate">{s.notes}</TableCell>
                  <TableCell><Switch checked={s.isActive} onCheckedChange={v => toggle.mutate({ id: s.id, isActive: v })} aria-label={`Active: ${s.name}`} /></TableCell>
                </TableRow>))}</TableBody></Table>
          )}
      </CardContent></Card>
      {adding && <SupplierDialog onClose={() => setAdding(false)} />}
    </div>
  );
}

function SupplierDialog({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient(); const { toast } = useToast();
  const [f, setF] = useState({ name: "", phone: "", email: "", notes: "" }); const [error, setError] = useState("");
  const m = useMutation({
    mutationFn: () => api("/inventory/suppliers", { body: { name: f.name.trim(), phone: f.phone.trim() || undefined, email: f.email.trim() || undefined, notes: f.notes.trim() || undefined } }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["suppliers"] }); toast({ title: "Supplier added" }); onClose(); },
    onError: (e: Error) => setError(e.message),
  });
  return (
    <Dialog open onOpenChange={o => { if (!o) onClose(); }}>
      <DialogContent>
        <DialogHeader><DialogTitle>Add supplier</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5"><Label>Name</Label><Input value={f.name} onChange={e => setF({ ...f, name: e.target.value })} autoFocus /></div>
          <div className="grid sm:grid-cols-2 gap-3">
            <div className="space-y-1.5"><Label>Phone</Label><Input value={f.phone} onChange={e => setF({ ...f, phone: e.target.value })} /></div>
            <div className="space-y-1.5"><Label>Email</Label><Input type="email" value={f.email} onChange={e => setF({ ...f, email: e.target.value })} /></div>
          </div>
          <div className="space-y-1.5"><Label>Notes</Label><Input value={f.notes} onChange={e => setF({ ...f, notes: e.target.value })} placeholder="What they supply, lead time, payment terms…" /></div>
          {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
        </div>
        <DialogFooter><Button variant="outline" onClick={onClose}>Cancel</Button><Button disabled={f.name.trim().length < 2 || m.isPending} onClick={() => { setError(""); m.mutate(); }}>{m.isPending && <Loader2 className="h-4 w-4 animate-spin" />} Add</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Restock plan ───────────────────────────────────────────────────────────

export function ReorderPage() {
  const nav = useNavigate(); const qc = useQueryClient(); const { toast } = useToast();
  const { data, isLoading, error } = useQuery({ queryKey: ["inventory", "reorder"], queryFn: () => api<Suggestion[]>("/inventory/reorder") });
  const { data: suppliers } = useSuppliers();
  const [picked, setPicked] = useState<Record<string, { on: boolean; qty: string }>>({});
  const [supplierId, setSupplierId] = useState("");

  const chosen = (data ?? []).filter(s => picked[s.productId]?.on);
  const create = useMutation({
    mutationFn: () => api<Po>("/inventory/purchase-orders", {
      body: { supplierId, items: chosen.map(s => ({ productId: s.productId, quantity: Number(picked[s.productId].qty || s.suggested), unitCost: s.costPrice ?? undefined })) },
    }),
    onSuccess: po => { qc.invalidateQueries({ queryKey: ["inventory"] }); toast({ title: `Purchase order ${po.number} drafted` }); nav("/admin/inventory/purchase-orders"); },
    onError: (e: Error) => toast({ title: "Couldn't create it", description: e.message, variant: "destructive" }),
  });

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">Items that are low, plus anything customers have ordered that you don&apos;t have enough of. Tick what to buy and turn it into a purchase order.</p>
      <Card><CardContent className="p-0 overflow-x-auto">
        {isLoading ? <Loader2 className="h-5 w-5 animate-spin mx-auto my-12 text-muted-foreground" />
          : error ? <p className="p-6 text-sm text-destructive">{(error as Error).message}</p>
          : !data?.length ? <p className="p-8 text-center text-sm text-muted-foreground">Nothing needs restocking right now.</p>
          : (
            <Table><TableHeader><TableRow><TableHead /><TableHead>Product</TableHead><TableHead className="text-right">Available</TableHead><TableHead className="text-right">Customers want</TableHead><TableHead className="text-right">Short by</TableHead><TableHead className="text-right">Buy</TableHead></TableRow></TableHeader>
              <TableBody>{data.map(s => {
                const p = picked[s.productId] ?? { on: false, qty: String(s.suggested) };
                return (
                  <TableRow key={s.productId}>
                    <TableCell><input type="checkbox" aria-label={`Select ${s.name}`} checked={p.on} onChange={e => setPicked(x => ({ ...x, [s.productId]: { ...p, on: e.target.checked } }))} /></TableCell>
                    <TableCell><p className="font-medium">{s.name}</p><p className="text-xs text-muted-foreground">{s.sku} · reorder at {s.reorderLevel}</p></TableCell>
                    <TableCell className="text-right font-mono">{s.available}</TableCell>
                    <TableCell className="text-right font-mono">{s.demand}</TableCell>
                    <TableCell className={`text-right font-mono ${s.shortfall ? "text-destructive font-semibold" : ""}`}>{s.shortfall}</TableCell>
                    <TableCell className="text-right"><Input type="number" min={1} className="w-20 h-8 ml-auto" value={p.qty} onChange={e => setPicked(x => ({ ...x, [s.productId]: { ...p, qty: e.target.value } }))} /></TableCell>
                  </TableRow>);
              })}</TableBody></Table>
          )}
      </CardContent></Card>
      {chosen.length > 0 && (
        <div className="flex flex-wrap items-end gap-3">
          <div className="space-y-1.5"><Label>Supplier</Label>
            <select className={select + " w-60"} value={supplierId} onChange={e => setSupplierId(e.target.value)}><option value="">Select…</option>{suppliers?.filter(s => s.isActive).map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select></div>
          <Button disabled={!supplierId || create.isPending} onClick={() => create.mutate()}>{create.isPending && <Loader2 className="h-4 w-4 animate-spin" />} Draft purchase order ({chosen.length} item{chosen.length === 1 ? "" : "s"})</Button>
          {!suppliers?.length && <span className="text-xs text-muted-foreground">Add a supplier first, in the Suppliers tab.</span>}
        </div>
      )}
    </div>
  );
}

// ── Purchase orders ────────────────────────────────────────────────────────

export function PurchaseOrdersPage() {
  const qc = useQueryClient(); const { toast } = useToast();
  const { data, isLoading, error } = useQuery({ queryKey: ["inventory", "pos"], queryFn: () => api<Po[]>("/inventory/purchase-orders") });
  const [receiving, setReceiving] = useState<Po | null>(null);
  const status = useMutation({
    mutationFn: (v: { id: string; status: "ORDERED" | "CANCELLED" }) => api(`/inventory/purchase-orders/${v.id}/status`, { body: { status: v.status } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["inventory"] }),
    onError: (e: Error) => toast({ title: "Couldn't update", description: e.message, variant: "destructive" }),
  });
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">Bulk buying. Draft from the <Link to="/admin/inventory/reorder" className="underline">restock plan</Link>, mark it ordered, then receive goods as they arrive (in parts if needed).</p>
      {isLoading ? <Loader2 className="h-5 w-5 animate-spin mx-auto my-12 text-muted-foreground" />
        : error ? <p className="text-sm text-destructive">{(error as Error).message}</p>
        : !data?.length ? <Card><CardContent className="p-8 text-center text-sm text-muted-foreground">No purchase orders yet.</CardContent></Card>
        : data.map(po => (
          <Card key={po.id}>
            <CardHeader className="pb-2 flex-row flex-wrap items-center gap-3 space-y-0">
              <CardTitle className="text-base font-mono">{po.number}</CardTitle>
              <span className={`text-xs px-2 py-0.5 rounded-full ${poChip[po.status]}`}>{po.status.toLowerCase()}</span>
              <span className="text-sm text-muted-foreground">{po.supplier.name}{po.total ? ` · ${money(po.total)}` : ""}</span>
              <div className="ml-auto flex gap-2">
                {po.status === "DRAFT" && <Button size="sm" disabled={status.isPending} onClick={() => status.mutate({ id: po.id, status: "ORDERED" })}>Mark as ordered</Button>}
                {(po.status === "ORDERED" || po.status === "PARTIAL") && <Button size="sm" onClick={() => setReceiving(po)}>Receive goods</Button>}
                {(po.status === "DRAFT" || po.status === "ORDERED") && <Button size="sm" variant="ghost" className="text-destructive" disabled={status.isPending} onClick={() => status.mutate({ id: po.id, status: "CANCELLED" })}>Cancel</Button>}
              </div>
            </CardHeader>
            <CardContent className="text-sm space-y-1">
              {po.items.map(i => (
                <div key={i.id} className="flex justify-between gap-3"><span>{i.name} <span className="text-xs text-muted-foreground">{i.sku}</span></span><span className="font-mono">{i.received}/{i.quantity}{i.unitCost !== null ? ` · ${money(i.unitCost)}` : ""}</span></div>
              ))}
            </CardContent>
          </Card>
        ))}
      {receiving && <ReceiveDialog po={receiving} onClose={() => setReceiving(null)} />}
    </div>
  );
}

function ReceiveDialog({ po, onClose }: { po: Po; onClose: () => void }) {
  const qc = useQueryClient(); const { toast } = useToast();
  const [qty, setQty] = useState<Record<string, string>>(Object.fromEntries(po.items.map(i => [i.id, String(i.quantity - i.received)])));
  const [ref, setRef] = useState(""); const [error, setError] = useState("");
  const [receiptId] = useState(() => crypto.randomUUID()); // retry-safe: the same id can never add goods twice
  const m = useMutation({
    mutationFn: () => api(`/inventory/purchase-orders/${po.id}/receive`, { body: { receiptId, reference: ref.trim() || undefined, items: po.items.map(i => ({ itemId: i.id, quantity: Number(qty[i.id] || 0) })).filter(i => i.quantity > 0) } }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["inventory"] }); toast({ title: "Goods received", description: po.number }); onClose(); },
    onError: (e: Error) => setError(e.message),
  });
  return (
    <Dialog open onOpenChange={o => { if (!o) onClose(); }}>
      <DialogContent>
        <DialogHeader><DialogTitle>Receive goods · {po.number}</DialogTitle><DialogDescription>Enter what actually arrived. It goes straight into stock.</DialogDescription></DialogHeader>
        <div className="space-y-2">
          {po.items.map(i => (
            <div key={i.id} className="flex items-center justify-between gap-3 text-sm">
              <span className="flex-1">{i.name}<span className="block text-xs text-muted-foreground">{i.quantity - i.received} still to come</span></span>
              <Input type="number" min={0} max={i.quantity - i.received} className="w-24" value={qty[i.id]} onChange={e => setQty(x => ({ ...x, [i.id]: e.target.value }))} />
            </div>
          ))}
          <div className="space-y-1.5 pt-2"><Label>Supplier invoice / delivery note no.</Label><Input value={ref} onChange={e => setRef(e.target.value)} /></div>
          {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
        </div>
        <DialogFooter><Button variant="outline" onClick={onClose}>Cancel</Button><Button disabled={m.isPending} onClick={() => { setError(""); m.mutate(); }}>{m.isPending && <Loader2 className="h-4 w-4 animate-spin" />} Receive</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
