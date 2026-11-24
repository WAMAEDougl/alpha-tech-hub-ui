import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ClipboardList, Loader2, PackagePlus, Search, Settings2, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/lib/api";

interface StockRow {
  id: string; sku: string; name: string; brand: string; category: string;
  stock: number; reserved: number; available: number; reorderLevel: number; location: string | null;
  allowSupplierSourcing: boolean; costPrice: number | null; price: number;
  toPick: number; awaitingApproval: number; status: "OK" | "LOW" | "OUT";
}

type Mode = "receive" | "count" | "writeoff" | "settings";

function ActionDialog({ mode, row, onClose }: { mode: Mode; row: StockRow; onClose: () => void }) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [qty, setQty] = useState(mode === "count" ? String(row.stock) : "");
  const [text, setText] = useState("");
  const [ref, setRef] = useState("");
  const [cost, setCost] = useState(row.costPrice?.toString() ?? "");
  const [reorder, setReorder] = useState(String(row.reorderLevel));
  const [loc, setLoc] = useState(row.location ?? "");
  const [supplier, setSupplier] = useState(row.allowSupplierSourcing);
  const [error, setError] = useState("");

  const m = useMutation({
    mutationFn: () => {
      const n = Number(qty);
      if (mode === "receive") return api("/inventory/receive", { body: { productId: row.id, quantity: n, supplier: text || undefined, reference: ref || undefined, costPrice: cost ? Number(cost) : undefined } });
      if (mode === "count") return api("/inventory/stock-take", { body: { productId: row.id, countedQuantity: n, reason: text } });
      if (mode === "writeoff") return api("/inventory/write-off", { body: { productId: row.id, quantity: n, reason: text } });
      return api(`/inventory/${row.id}/settings`, { method: "PATCH", body: { reorderLevel: Number(reorder), location: loc.trim() || undefined, costPrice: cost ? Number(cost) : undefined, allowSupplierSourcing: supplier } });
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["inventory"] }); toast({ title: "Saved", description: row.name }); onClose(); },
    onError: (e: Error) => setError(e.message),
  });

  const titles: Record<Mode, string> = { receive: "Receive stock", count: "Count the shelf", writeoff: "Write off damaged / lost stock", settings: "Stock settings" };
  const n = Number(qty);
  const free = row.stock - row.reserved;
  const valid =
    mode === "settings" ? reorder !== "" && Number(reorder) >= 0 :
    mode === "count" ? qty !== "" && Number.isInteger(n) && n >= 0 && text.trim().length >= 3 :
    mode === "writeoff" ? Number.isInteger(n) && n >= 1 && n <= free && text.trim().length >= 3 :
    Number.isInteger(n) && n >= 1;

  return (
    <Dialog open onOpenChange={o => { if (!o) onClose(); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{titles[mode]}</DialogTitle>
          <DialogDescription>{row.name} · {row.sku} · {row.stock} on the shelf, {row.reserved} reserved for orders</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          {mode !== "settings" && (
            <div className="space-y-1.5">
              <Label>{mode === "count" ? "Counted quantity" : mode === "writeoff" ? `Quantity (max ${Math.max(0, free)} free)` : "Quantity"}</Label>
              <Input type="number" min={mode === "count" ? 0 : 1} value={qty} onChange={e => setQty(e.target.value)} autoFocus />
              {mode === "count" && qty !== "" && Number(qty) !== row.stock && <p className="text-xs text-muted-foreground">Difference: {Number(qty) - row.stock > 0 ? "+" : ""}{Number(qty) - row.stock}</p>}
              {mode === "count" && row.reserved > 0 && <p className="text-xs text-muted-foreground">{row.reserved} units are reserved for orders, so the count can&apos;t be lower than that.</p>}
            </div>
          )}
          {mode === "receive" && (<>
            <div className="space-y-1.5"><Label>Supplier</Label><Input value={text} onChange={e => setText(e.target.value)} placeholder="e.g. Computer Planet" /></div>
            <div className="space-y-1.5"><Label>Invoice / delivery note no.</Label><Input value={ref} onChange={e => setRef(e.target.value)} /></div>
          </>)}
          {(mode === "count" || mode === "writeoff") && (
            <div className="space-y-1.5"><Label>Reason (required)</Label>
              <Input value={text} onChange={e => setText(e.target.value)} placeholder={mode === "count" ? "e.g. Found 2 extra in the back store" : "e.g. Screen cracked in storage"} /></div>
          )}
          {(mode === "receive" || mode === "settings") && (
            <div className="space-y-1.5"><Label>Cost price per unit (KES)</Label><Input type="number" min={0} value={cost} onChange={e => setCost(e.target.value)} /></div>
          )}
          {mode === "settings" && (<>
            <div className="space-y-1.5"><Label>Reorder level (warn when available is at or below)</Label><Input type="number" min={0} value={reorder} onChange={e => setReorder(e.target.value)} /></div>
            <div className="space-y-1.5"><Label>Shelf / bin location</Label><Input value={loc} onChange={e => setLoc(e.target.value)} placeholder="e.g. A-03" /></div>
            <label className="flex items-start gap-2 text-sm cursor-pointer">
              <Checkbox checked={supplier} onCheckedChange={c => setSupplier(!!c)} className="mt-0.5" />
              <span>Customers can order more than is on the shelf. <span className="text-muted-foreground">The shortfall is sourced from a supplier after the order is approved. Leave off for items you only sell from stock.</span></span>
            </label>
          </>)}
          {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button disabled={!valid || m.isPending} onClick={() => { setError(""); m.mutate(); }}>{m.isPending && <Loader2 className="h-4 w-4 animate-spin" />} Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function StockPage() {
  const [search, setSearch] = useState("");
  const [lowOnly, setLowOnly] = useState(false);
  const [action, setAction] = useState<{ mode: Mode; row: StockRow } | null>(null);

  const { data, isLoading, error } = useQuery({
    queryKey: ["inventory", "stock", search, lowOnly],
    queryFn: () => api<StockRow[]>(`/inventory/stock?search=${encodeURIComponent(search)}${lowOnly ? "&filter=low" : ""}`),
    placeholderData: prev => prev,
  });

  const badge = (s: StockRow["status"]) =>
    s === "OUT" ? <Badge variant="destructive">Out</Badge>
    : s === "LOW" ? <Badge className="bg-amber-500/15 text-amber-600 dark:text-amber-400 hover:bg-amber-500/15">Low</Badge>
    : <Badge variant="outline">OK</Badge>;

  return (
    <Card>
      <CardHeader className="pb-3 flex-row flex-wrap items-center gap-3 space-y-0">
        <div className="relative w-full max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search name, SKU or brand…" className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <Button variant={lowOnly ? "default" : "outline"} size="sm" onClick={() => setLowOnly(v => !v)}>Low / out only</Button>
      </CardHeader>
      <CardContent className="p-0 overflow-x-auto">
        {isLoading ? <Loader2 className="h-5 w-5 animate-spin mx-auto my-12 text-muted-foreground" />
          : error ? <p className="p-6 text-sm text-destructive">{(error as Error).message}</p>
          : !data?.length ? <p className="p-6 text-sm text-muted-foreground text-center">{search || lowOnly ? "No products match." : "No products yet. Add products first."}</p>
          : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead><TableHead>Location</TableHead>
                  <TableHead className="text-right" title="Physically on the shelf">On shelf</TableHead>
                  <TableHead className="text-right" title="Held for approved orders">Reserved</TableHead>
                  <TableHead className="text-right" title="On shelf minus reserved: what can still be sold">Available</TableHead>
                  <TableHead className="text-right" title="Units approved orders still need picked">To pick</TableHead>
                  <TableHead className="text-right" title="Units wanted by orders the office has not approved yet">Waiting</TableHead>
                  <TableHead>Status</TableHead><TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.map(r => (
                  <TableRow key={r.id}>
                    <TableCell><p className="font-medium">{r.name}</p><p className="text-xs text-muted-foreground">{r.sku} · {r.category}{r.allowSupplierSourcing ? " · supplier-sourced" : ""}</p></TableCell>
                    <TableCell className="font-mono text-xs">{r.location ?? "—"}</TableCell>
                    <TableCell className="text-right font-mono font-semibold">{r.stock}</TableCell>
                    <TableCell className="text-right font-mono text-muted-foreground">{r.reserved}</TableCell>
                    <TableCell className="text-right font-mono font-semibold">{r.available}</TableCell>
                    <TableCell className="text-right font-mono text-muted-foreground">{r.toPick}</TableCell>
                    <TableCell className="text-right font-mono text-muted-foreground">{r.awaitingApproval}</TableCell>
                    <TableCell>{badge(r.status)}</TableCell>
                    <TableCell className="text-right whitespace-nowrap">
                      <Button size="sm" variant="outline" onClick={() => setAction({ mode: "receive", row: r })}><PackagePlus className="h-3.5 w-3.5" /> Receive</Button>{" "}
                      <Button size="icon" variant="ghost" title="Count the shelf" onClick={() => setAction({ mode: "count", row: r })}><ClipboardList className="h-4 w-4" /></Button>
                      <Button size="icon" variant="ghost" title="Write off" disabled={r.available === 0} onClick={() => setAction({ mode: "writeoff", row: r })}><Trash2 className="h-4 w-4" /></Button>
                      <Button size="icon" variant="ghost" title="Settings" onClick={() => setAction({ mode: "settings", row: r })}><Settings2 className="h-4 w-4" /></Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
      </CardContent>
      {action && <ActionDialog mode={action.mode} row={action.row} onClose={() => setAction(null)} />}
    </Card>
  );
}
