import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { api, money } from "@/lib/api";

interface Settings {
  paybillNumber: string | null; tillNumber: string | null; mpesaManualEnabled: boolean; mpesaStkEnabled: boolean; codEnabled: boolean; returnWindowDays: number;
}
interface Zone { id: string; name: string; fee: number; areas: string[]; estimatedDays: string | null; isActive: boolean }
interface Discount { id: string; code: string; type: "PERCENT" | "FIXED" | "FREE_DELIVERY"; value: number; minSubtotal: number | null; maxUses: number | null; usedCount: number; expiresAt: string | null; isActive: boolean }

// ── payments ───────────────────────────────────────────────────────────────

function PaymentsTab() {
  const qc = useQueryClient(); const { toast } = useToast();
  const { data, isLoading, error } = useQuery({ queryKey: ["settings"], queryFn: () => api<Settings>("/settings", { auth: false }) });
  const [f, setF] = useState<Settings | null>(null);
  useEffect(() => { if (data && !f) setF(data); }, [data, f]);
  const save = useMutation({
    mutationFn: () => api("/settings", { method: "PATCH", body: {
      paybillNumber: f!.paybillNumber?.trim() || "", tillNumber: f!.tillNumber?.trim() || "", mpesaManualEnabled: f!.mpesaManualEnabled,
      mpesaStkEnabled: f!.mpesaStkEnabled, codEnabled: f!.codEnabled, returnWindowDays: Number(f!.returnWindowDays),
    } }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["settings"] }); toast({ title: "Saved" }); },
    onError: (e: Error) => toast({ title: "Couldn't save", description: e.message, variant: "destructive" }),
  });
  if (isLoading || !f) return error ? <p className="text-sm text-destructive">{(error as Error).message}</p> : <Loader2 className="h-5 w-5 animate-spin mx-auto my-12 text-muted-foreground" />;
  const sw = (k: keyof Settings, label: string, hint: string) => (
    <div className="flex items-start justify-between gap-4"><div><p className="text-sm font-medium">{label}</p><p className="text-xs text-muted-foreground">{hint}</p></div>
      <Switch checked={!!f[k]} onCheckedChange={v => setF({ ...f, [k]: v })} aria-label={label} /></div>
  );
  const noNumber = f.mpesaManualEnabled && !f.paybillNumber?.trim() && !f.tillNumber?.trim();
  return (
    <Card><CardContent className="p-5 space-y-5 max-w-2xl">
      {sw("mpesaManualEnabled", "Pay by M-Pesa (paybill / till)", "Customers pay to your number, then enter the M-Pesa code. The office verifies it against the statement.")}
      <div className="grid sm:grid-cols-2 gap-3">
        <div className="space-y-1.5"><Label>Paybill number</Label><Input value={f.paybillNumber ?? ""} onChange={e => setF({ ...f, paybillNumber: e.target.value })} placeholder="e.g. 123456" inputMode="numeric" /></div>
        <div className="space-y-1.5"><Label>Till number (if you use a till)</Label><Input value={f.tillNumber ?? ""} onChange={e => setF({ ...f, tillNumber: e.target.value })} inputMode="numeric" /></div>
      </div>
      {noNumber && <p className="text-sm text-amber-600 dark:text-amber-400">Add a paybill or till number, otherwise customers won&apos;t know where to send the money.</p>}
      {sw("codEnabled", "Cash on delivery / pay at the shop", "Customers pay when the order arrives or when they collect. The office confirms the cash was collected.")}
      {sw("mpesaStkEnabled", "M-Pesa prompt on the customer's phone", "Needs Safaricom Daraja credentials in the server settings. Leave off until those are set up.")}
      <div className="space-y-1.5 max-w-xs"><Label>Return window (days after delivery, 0 = no returns)</Label><Input type="number" min={0} max={30} value={f.returnWindowDays} onChange={e => setF({ ...f, returnWindowDays: Number(e.target.value) })} /></div>
      <Button disabled={save.isPending} onClick={() => save.mutate()}>{save.isPending && <Loader2 className="h-4 w-4 animate-spin" />} Save payment settings</Button>
    </CardContent></Card>
  );
}

// ── delivery zones ─────────────────────────────────────────────────────────

function ZoneDialog({ zone, onClose }: { zone: Zone | null; onClose: () => void }) {
  const qc = useQueryClient(); const { toast } = useToast();
  const [f, setF] = useState({ name: zone?.name ?? "", fee: String(zone?.fee ?? ""), areas: (zone?.areas ?? []).join(", "), estimatedDays: zone?.estimatedDays ?? "" });
  const [error, setError] = useState("");
  const m = useMutation({
    mutationFn: () => {
      const body = { name: f.name.trim(), fee: Number(f.fee), areas: f.areas.split(",").map(a => a.trim()).filter(Boolean), estimatedDays: f.estimatedDays.trim() || undefined };
      return zone ? api(`/zones/${zone.id}`, { method: "PATCH", body }) : api("/zones", { body });
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["zones-all"] }); toast({ title: "Zone saved" }); onClose(); },
    onError: (e: Error) => setError(e.message),
  });
  return (
    <Dialog open onOpenChange={o => { if (!o) onClose(); }}>
      <DialogContent>
        <DialogHeader><DialogTitle>{zone ? "Edit delivery zone" : "Add delivery zone"}</DialogTitle><DialogDescription>Customers pick a zone at checkout and pay its fee. An address that matches no zone is flagged so the office can agree a fee first.</DialogDescription></DialogHeader>
        <div className="space-y-3">
          <div className="grid sm:grid-cols-2 gap-3">
            <div className="space-y-1.5"><Label>Zone name</Label><Input value={f.name} onChange={e => setF({ ...f, name: e.target.value })} placeholder="e.g. Nanyuki Town" autoFocus /></div>
            <div className="space-y-1.5"><Label>Delivery fee (KES)</Label><Input type="number" min={0} value={f.fee} onChange={e => setF({ ...f, fee: e.target.value })} /></div>
          </div>
          <div className="space-y-1.5"><Label>Areas it covers (comma separated)</Label><Input value={f.areas} onChange={e => setF({ ...f, areas: e.target.value })} placeholder="nanyuki, likii, ngangarithi" />
            <p className="text-xs text-muted-foreground">Used to match what a customer types as their town or estate.</p></div>
          <div className="space-y-1.5"><Label>Delivery time</Label><Input value={f.estimatedDays} onChange={e => setF({ ...f, estimatedDays: e.target.value })} placeholder="e.g. Same day / 1-2 days" /></div>
          {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
        </div>
        <DialogFooter><Button variant="outline" onClick={onClose}>Cancel</Button><Button disabled={f.name.trim().length < 2 || f.fee === "" || m.isPending} onClick={() => { setError(""); m.mutate(); }}>{m.isPending && <Loader2 className="h-4 w-4 animate-spin" />} Save</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ZonesTab() {
  const qc = useQueryClient(); const { toast } = useToast();
  const { data, isLoading, error } = useQuery({ queryKey: ["zones-all"], queryFn: () => api<Zone[]>("/zones/all") });
  const [edit, setEdit] = useState<Zone | null | "new">(null);
  const toggle = useMutation({ mutationFn: (v: { id: string; isActive: boolean }) => api(`/zones/${v.id}`, { method: "PATCH", body: { isActive: v.isActive } }), onSuccess: () => qc.invalidateQueries({ queryKey: ["zones-all"] }) });
  const del = useMutation({ mutationFn: (id: string) => api(`/zones/${id}`, { method: "DELETE" }), onSuccess: () => { qc.invalidateQueries({ queryKey: ["zones-all"] }); toast({ title: "Zone removed" }); }, onError: (e: Error) => toast({ title: "Couldn't remove", description: e.message, variant: "destructive" }) });
  return (
    <div className="space-y-4">
      <div className="flex justify-end"><Button onClick={() => setEdit("new")}><Plus className="h-4 w-4" /> Add zone</Button></div>
      <Card><CardContent className="p-0">
        {isLoading ? <Loader2 className="h-5 w-5 animate-spin mx-auto my-12 text-muted-foreground" />
          : error ? <p className="p-6 text-sm text-destructive">{(error as Error).message}</p>
          : !data?.length ? <p className="p-8 text-center text-sm text-muted-foreground">No delivery zones. Customers can only choose pickup until you add one.</p>
          : (
            <Table><TableHeader><TableRow><TableHead>Zone</TableHead><TableHead className="text-right">Fee</TableHead><TableHead>Covers</TableHead><TableHead>Time</TableHead><TableHead>Active</TableHead><TableHead /></TableRow></TableHeader>
              <TableBody>{data.map(z => (
                <TableRow key={z.id}>
                  <TableCell className="font-medium">{z.name}</TableCell><TableCell className="text-right">{money(z.fee)}</TableCell>
                  <TableCell className="text-xs text-muted-foreground max-w-xs truncate">{z.areas.join(", ")}</TableCell><TableCell className="text-sm">{z.estimatedDays}</TableCell>
                  <TableCell><Switch checked={z.isActive} onCheckedChange={v => toggle.mutate({ id: z.id, isActive: v })} aria-label={`Active: ${z.name}`} /></TableCell>
                  <TableCell className="text-right whitespace-nowrap"><Button size="sm" variant="outline" onClick={() => setEdit(z)}>Edit</Button>{" "}
                    <Button size="icon" variant="ghost" aria-label={`Remove ${z.name}`} onClick={() => { if (confirm(`Remove "${z.name}"? Zones used by past orders are switched off instead.`)) del.mutate(z.id); }}><Trash2 className="h-4 w-4 text-destructive" /></Button></TableCell>
                </TableRow>))}</TableBody></Table>
          )}
      </CardContent></Card>
      {edit && <ZoneDialog zone={edit === "new" ? null : edit} onClose={() => setEdit(null)} />}
    </div>
  );
}

// ── discount codes ─────────────────────────────────────────────────────────

const describe = (d: Discount) => (d.type === "PERCENT" ? `${d.value}% off` : d.type === "FIXED" ? `${money(d.value)} off` : "Free delivery");

function DiscountDialog({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient(); const { toast } = useToast();
  const [f, setF] = useState({ code: "", type: "PERCENT" as Discount["type"], value: "", minSubtotal: "", maxUses: "", expiresAt: "" });
  const [error, setError] = useState("");
  const m = useMutation({
    mutationFn: () => api("/discounts", { body: { code: f.code.trim(), type: f.type, value: f.type === "FREE_DELIVERY" ? 0 : Number(f.value), minSubtotal: f.minSubtotal ? Number(f.minSubtotal) : undefined, maxUses: f.maxUses ? Number(f.maxUses) : undefined, expiresAt: f.expiresAt ? new Date(f.expiresAt + "T23:59:59").toISOString() : undefined } }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["discounts"] }); toast({ title: "Code created" }); onClose(); },
    onError: (e: Error) => setError(e.message),
  });
  const chip = (t: Discount["type"], l: string) => <Button type="button" size="sm" variant={f.type === t ? "default" : "outline"} onClick={() => setF({ ...f, type: t })}>{l}</Button>;
  return (
    <Dialog open onOpenChange={o => { if (!o) onClose(); }}>
      <DialogContent>
        <DialogHeader><DialogTitle>New discount code</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5"><Label>Code</Label><Input className="uppercase" value={f.code} onChange={e => setF({ ...f, code: e.target.value.toUpperCase() })} placeholder="WELCOME10" autoFocus /></div>
          <div className="flex gap-2">{chip("PERCENT", "% off")}{chip("FIXED", "KES off")}{chip("FREE_DELIVERY", "Free delivery")}</div>
          {f.type !== "FREE_DELIVERY" && <div className="space-y-1.5"><Label>{f.type === "PERCENT" ? "Percent (1-100)" : "Amount (KES)"}</Label><Input type="number" min={1} max={f.type === "PERCENT" ? 100 : undefined} value={f.value} onChange={e => setF({ ...f, value: e.target.value })} /></div>}
          <div className="grid sm:grid-cols-3 gap-3">
            <div className="space-y-1.5"><Label>Min order (KES)</Label><Input type="number" min={0} value={f.minSubtotal} onChange={e => setF({ ...f, minSubtotal: e.target.value })} /></div>
            <div className="space-y-1.5"><Label>Max uses</Label><Input type="number" min={1} value={f.maxUses} onChange={e => setF({ ...f, maxUses: e.target.value })} /></div>
            <div className="space-y-1.5"><Label>Expires</Label><Input type="date" value={f.expiresAt} onChange={e => setF({ ...f, expiresAt: e.target.value })} /></div>
          </div>
          {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
        </div>
        <DialogFooter><Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button disabled={f.code.trim().length < 3 || (f.type !== "FREE_DELIVERY" && !(Number(f.value) > 0)) || m.isPending} onClick={() => { setError(""); m.mutate(); }}>{m.isPending && <Loader2 className="h-4 w-4 animate-spin" />} Create</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function DiscountsTab() {
  const qc = useQueryClient();
  const { data, isLoading, error } = useQuery({ queryKey: ["discounts"], queryFn: () => api<Discount[]>("/discounts") });
  const [adding, setAdding] = useState(false);
  const toggle = useMutation({ mutationFn: (v: { id: string; isActive: boolean }) => api(`/discounts/${v.id}`, { method: "PATCH", body: { isActive: v.isActive } }), onSuccess: () => qc.invalidateQueries({ queryKey: ["discounts"] }) });
  return (
    <div className="space-y-4">
      <div className="flex justify-end"><Button onClick={() => setAdding(true)}><Plus className="h-4 w-4" /> New code</Button></div>
      <Card><CardContent className="p-0">
        {isLoading ? <Loader2 className="h-5 w-5 animate-spin mx-auto my-12 text-muted-foreground" />
          : error ? <p className="p-6 text-sm text-destructive">{(error as Error).message}</p>
          : !data?.length ? <p className="p-8 text-center text-sm text-muted-foreground">No discount codes yet.</p>
          : (
            <Table><TableHeader><TableRow><TableHead>Code</TableHead><TableHead>Offer</TableHead><TableHead>Rules</TableHead><TableHead className="text-right">Used</TableHead><TableHead>Active</TableHead></TableRow></TableHeader>
              <TableBody>{data.map(d => (
                <TableRow key={d.id}>
                  <TableCell className="font-mono font-medium">{d.code}</TableCell><TableCell>{describe(d)}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{[d.minSubtotal ? `min ${money(d.minSubtotal)}` : "", d.expiresAt ? `until ${new Date(d.expiresAt).toLocaleDateString("en-KE")}` : ""].filter(Boolean).join(" · ") || "—"}</TableCell>
                  <TableCell className="text-right font-mono">{d.usedCount}{d.maxUses ? `/${d.maxUses}` : ""}</TableCell>
                  <TableCell><Switch checked={d.isActive} onCheckedChange={v => toggle.mutate({ id: d.id, isActive: v })} aria-label={`Active: ${d.code}`} /></TableCell>
                </TableRow>))}</TableBody></Table>
          )}
      </CardContent></Card>
      {adding && <DiscountDialog onClose={() => setAdding(false)} />}
    </div>
  );
}

export default function ShopSetupPage() {
  return (
    <div className="space-y-5">
      <div><h1 className="text-2xl font-heading font-bold">Shop setup</h1><p className="text-sm text-muted-foreground">How customers pay, where you deliver, and the discount codes they can use.</p></div>
      <Tabs defaultValue="payments">
        <TabsList><TabsTrigger value="payments">Payments &amp; returns</TabsTrigger><TabsTrigger value="zones">Delivery zones</TabsTrigger><TabsTrigger value="discounts">Discount codes</TabsTrigger></TabsList>
        <TabsContent value="payments" className="mt-4"><PaymentsTab /></TabsContent>
        <TabsContent value="zones" className="mt-4"><ZonesTab /></TabsContent>
        <TabsContent value="discounts" className="mt-4"><DiscountsTab /></TabsContent>
      </Tabs>
    </div>
  );
}
