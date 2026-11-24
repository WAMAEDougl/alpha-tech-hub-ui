import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/lib/api";

interface TakeRow { id: string; status: "OPEN" | "APPLIED" | "CANCELLED"; note: string | null; createdAt: string; products: number; counted: number; discrepancies: number }
interface TakeItem { id: string; productId: string; name: string; sku: string; location: string | null; reserved: number; expected: number; counted: number | null; difference: number | null }
interface Take { id: string; status: "OPEN" | "APPLIED" | "CANCELLED"; note: string | null; createdAt: string; items: TakeItem[] }

const fmt = (iso: string) => new Date(iso).toLocaleDateString("en-KE", { day: "numeric", month: "short", year: "numeric" });

export default function StockTakesPage() {
  const qc = useQueryClient(); const { toast } = useToast();
  const [openId, setOpenId] = useState<string | null>(null);
  const { data, isLoading, error } = useQuery({ queryKey: ["inventory", "takes"], queryFn: () => api<TakeRow[]>("/inventory/stock-takes") });
  const start = useMutation({
    mutationFn: () => api<Take>("/inventory/stock-takes", { body: {} }),
    onSuccess: t => { qc.invalidateQueries({ queryKey: ["inventory"] }); setOpenId(t.id); },
    onError: (e: Error) => toast({ title: "Couldn't start", description: e.message, variant: "destructive" }),
  });
  if (openId) return <TakeSheet id={openId} onBack={() => { setOpenId(null); qc.invalidateQueries({ queryKey: ["inventory"] }); }} />;
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">Count what is physically on the shelves, review the differences, then apply them. Every change is recorded.</p>
        <Button disabled={start.isPending} onClick={() => start.mutate()}>{start.isPending && <Loader2 className="h-4 w-4 animate-spin" />} Start a stock-take</Button>
      </div>
      <Card><CardContent className="p-0">
        {isLoading ? <Loader2 className="h-5 w-5 animate-spin mx-auto my-12 text-muted-foreground" />
          : error ? <p className="p-6 text-sm text-destructive">{(error as Error).message}</p>
          : !data?.length ? <p className="p-8 text-center text-sm text-muted-foreground">No stock-takes yet.</p>
          : (
            <Table><TableHeader><TableRow><TableHead>Started</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Counted</TableHead><TableHead className="text-right">Differences</TableHead><TableHead /></TableRow></TableHeader>
              <TableBody>{data.map(t => (
                <TableRow key={t.id}>
                  <TableCell>{fmt(t.createdAt)}{t.note ? <span className="text-xs text-muted-foreground"> · {t.note}</span> : null}</TableCell>
                  <TableCell>{t.status.toLowerCase()}</TableCell>
                  <TableCell className="text-right font-mono">{t.counted}/{t.products}</TableCell>
                  <TableCell className="text-right font-mono">{t.discrepancies}</TableCell>
                  <TableCell className="text-right"><Button size="sm" variant="outline" onClick={() => setOpenId(t.id)}>{t.status === "OPEN" ? "Continue" : "View"}</Button></TableCell>
                </TableRow>))}</TableBody></Table>
          )}
      </CardContent></Card>
    </div>
  );
}

function TakeSheet({ id, onBack }: { id: string; onBack: () => void }) {
  const qc = useQueryClient(); const { toast } = useToast();
  const { data: t, isLoading, error } = useQuery({ queryKey: ["inventory", "take", id], queryFn: () => api<Take>(`/inventory/stock-takes/${id}`) });
  const [draft, setDraft] = useState<Record<string, string>>({});
  const refresh = (res: Take) => { qc.setQueryData(["inventory", "take", id], res); qc.invalidateQueries({ queryKey: ["inventory"] }); setDraft({}); };

  const save = useMutation({
    mutationFn: () => api<Take>(`/inventory/stock-takes/${id}/counts`, { method: "PATCH", body: { counts: Object.entries(draft).map(([productId, v]) => ({ productId, counted: v === "" ? null : Number(v) })) } }),
    onSuccess: res => { refresh(res); toast({ title: "Counts saved" }); },
    onError: (e: Error) => toast({ title: "Couldn't save", description: e.message, variant: "destructive" }),
  });
  const apply = useMutation({
    mutationFn: () => api<Take>(`/inventory/stock-takes/${id}/apply`, { body: {} }),
    onSuccess: res => { refresh(res); toast({ title: "Stock-take applied", description: "Stock now matches your count." }); },
    onError: (e: Error) => toast({ title: "Couldn't apply", description: e.message, variant: "destructive" }),
  });
  const cancel = useMutation({
    mutationFn: () => api<Take>(`/inventory/stock-takes/${id}/cancel`, { body: {} }),
    onSuccess: res => { refresh(res); onBack(); },
    onError: (e: Error) => toast({ title: "Couldn't cancel", description: e.message, variant: "destructive" }),
  });

  if (isLoading) return <Loader2 className="h-5 w-5 animate-spin mx-auto my-12 text-muted-foreground" />;
  if (error || !t) return <p className="text-sm text-destructive">{(error as Error)?.message ?? "Not found"}</p>;
  const open = t.status === "OPEN";
  const shown = (i: TakeItem) => (i.productId in draft ? draft[i.productId] : i.counted ?? "");
  const diffs = t.items.filter(i => i.difference !== null && i.difference !== 0);
  const dirty = Object.keys(draft).length > 0;

  return (
    <div className="space-y-4">
      <button onClick={onBack} className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" /> All stock-takes</button>
      <div className="flex flex-wrap items-center gap-3">
        <h2 className="text-lg font-heading font-semibold">Stock-take · {fmt(t.createdAt)}</h2>
        <span className="text-sm text-muted-foreground">{t.status.toLowerCase()}{diffs.length ? ` · ${diffs.length} difference${diffs.length === 1 ? "" : "s"}` : ""}</span>
        {open && (
          <div className="ml-auto flex gap-2">
            <Button variant="outline" disabled={!dirty || save.isPending} onClick={() => save.mutate()}>{save.isPending && <Loader2 className="h-4 w-4 animate-spin" />} Save counts</Button>
            <Button disabled={dirty || apply.isPending || !diffs.length} title={dirty ? "Save your counts first" : !diffs.length ? "No differences to apply" : undefined} onClick={() => apply.mutate()}>{apply.isPending && <Loader2 className="h-4 w-4 animate-spin" />} Apply {diffs.length} difference{diffs.length === 1 ? "" : "s"}</Button>
            <Button variant="ghost" className="text-destructive" disabled={cancel.isPending} onClick={() => cancel.mutate()}>Cancel</Button>
          </div>
        )}
      </div>
      <Card><CardContent className="p-0 overflow-x-auto">
        <Table><TableHeader><TableRow><TableHead>Product</TableHead><TableHead>Shelf</TableHead><TableHead className="text-right">Books say</TableHead><TableHead className="text-right">You counted</TableHead><TableHead className="text-right">Difference</TableHead></TableRow></TableHeader>
          <TableBody>{t.items.map(i => (
            <TableRow key={i.id}>
              <TableCell><p className="font-medium">{i.name}</p><p className="text-xs text-muted-foreground">{i.sku}{i.reserved ? ` · ${i.reserved} reserved for orders` : ""}</p></TableCell>
              <TableCell className="font-mono text-xs">{i.location ?? "—"}</TableCell>
              <TableCell className="text-right font-mono">{i.expected}</TableCell>
              <TableCell className="text-right">{open
                ? <Input type="number" min={0} className="w-24 h-8 ml-auto" value={shown(i)} onChange={e => setDraft(d => ({ ...d, [i.productId]: e.target.value }))} />
                : <span className="font-mono">{i.counted ?? "—"}</span>}</TableCell>
              <TableCell className={`text-right font-mono ${i.difference ? (i.difference > 0 ? "text-emerald-600 dark:text-emerald-400" : "text-destructive") : "text-muted-foreground"}`}>{i.difference === null ? "" : i.difference > 0 ? `+${i.difference}` : i.difference}</TableCell>
            </TableRow>))}</TableBody></Table>
      </CardContent></Card>
    </div>
  );
}
