import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { api, money } from "@/lib/api";

interface Insights {
  stockValueAtCost: number; stockValueAtRetail: number; missingCost: number;
  topMovers: { name: string; sku: string; sold: number }[];
  slowMovers: { name: string; sku: string; stock: number; value: number }[];
}

export function InsightsPage() {
  const { data, isLoading, error } = useQuery({ queryKey: ["inventory", "insights"], queryFn: () => api<Insights>("/inventory/insights") });
  if (isLoading) return <Loader2 className="h-5 w-5 animate-spin mx-auto my-12 text-muted-foreground" />;
  if (error || !data) return <p className="text-sm text-destructive">{(error as Error)?.message ?? "Could not load insights."}</p>;
  return (
    <div className="space-y-5">
      <div className="grid sm:grid-cols-2 gap-3">
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Stock value at cost</p><p className="text-2xl font-heading font-bold">{money(data.stockValueAtCost)}</p>
          {data.missingCost > 0 && <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">{data.missingCost} product{data.missingCost === 1 ? " has" : "s have"} no cost price, so this is understated.</p>}</CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Stock value at selling price</p><p className="text-2xl font-heading font-bold">{money(data.stockValueAtRetail)}</p></CardContent></Card>
      </div>
      <div className="grid lg:grid-cols-2 gap-5">
        <Card><CardHeader className="pb-2"><CardTitle className="text-base">Fastest movers (30 days)</CardTitle></CardHeader><CardContent className="text-sm space-y-1.5">
          {data.topMovers.length === 0 && <p className="text-muted-foreground">Nothing has left the shop in the last 30 days.</p>}
          {data.topMovers.map(m => <div key={m.sku} className="flex justify-between"><span>{m.name} <span className="text-xs text-muted-foreground">{m.sku}</span></span><span className="font-mono">{m.sold} sold</span></div>)}
        </CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-base">Not moving (no sales in 90 days)</CardTitle></CardHeader><CardContent className="text-sm space-y-1.5">
          {data.slowMovers.length === 0 && <p className="text-muted-foreground">Everything in stock has sold recently.</p>}
          {data.slowMovers.map(m => <div key={m.sku} className="flex justify-between"><span>{m.name} <span className="text-xs text-muted-foreground">{m.stock} in stock</span></span><span className="font-mono">{money(m.value)} tied up</span></div>)}
        </CardContent></Card>
      </div>
    </div>
  );
}

const Step = ({ n, title, who, children }: { n: number; title: string; who: string; children: React.ReactNode }) => (
  <li className="flex gap-4">
    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-semibold">{n}</span>
    <div className="space-y-0.5 pb-4">
      <p className="font-medium">{title} <span className="text-xs font-normal text-muted-foreground">· {who}</span></p>
      <p className="text-sm text-muted-foreground">{children}</p>
    </div>
  </li>
);

export function GuidePage() {
  return (
    <div className="grid lg:grid-cols-2 gap-6 items-start">
      <Card><CardHeader className="pb-2"><CardTitle className="text-base">An order, start to finish</CardTitle></CardHeader><CardContent>
        <ol>
          <Step n={1} title="Customer orders and pays" who="Customer / office">M-Pesa customers send the money, then enter the M-Pesa code. The office checks it against the statement. Cash-on-delivery orders skip this step. Nothing is reserved yet.</Step>
          <Step n={2} title="Office approves" who="Office">One click confirms the order, issues the invoice, and reserves the stock on the shelf for this order.</Step>
          <Step n={3} title="Source & pick" who="Inventory">Pick from the shelf. If there isn&apos;t enough, receive the rest from a supplier. It goes into stock and is picked for the order in one step.</Step>
          <Step n={4} title="Pack" who="Inventory">Check every item into the box, then mark the order packed.</Step>
          <Step n={5} title="Handoff" who="Inventory">Delivery: enter the rider&apos;s name and phone. Pickup: mark it ready for collection.</Step>
          <Step n={6} title="Delivered or collected" who="Office">The office confirms, and for cash orders confirms the money was collected.</Step>
        </ol>
      </CardContent></Card>
      <div className="space-y-6">
        <Card><CardHeader className="pb-2"><CardTitle className="text-base">When does stock actually change?</CardTitle></CardHeader><CardContent className="text-sm text-muted-foreground space-y-1.5">
          <p><b className="text-foreground">Approval:</b> stock is <i>reserved</i> for the order. It&apos;s still on the shelf but no longer available to other customers.</p>
          <p><b className="text-foreground">Packing:</b> no change.</p>
          <p><b className="text-foreground">Rider handoff (or customer collection):</b> the stock is deducted. This is the only moment goods leave your books, and it can only happen once.</p>
          <p><b className="text-foreground">Cancelled before handoff:</b> the reservation is released. Goods you received from a supplier stay in stock.</p>
          <p><b className="text-foreground">Cancelled after handoff / failed delivery:</b> a return opens. Nothing is restocked until you inspect the goods that come back.</p>
        </CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-base">Good habits</CardTitle></CardHeader><CardContent className="text-sm text-muted-foreground space-y-1.5">
          <p>Hand over only when the goods are really in the rider&apos;s hands.</p>
          <p>If something is wrong (damaged item, can&apos;t source it) use <b className="text-foreground">Report a problem</b>. The office decides, then work resumes.</p>
          <p>Count the shelf regularly with a stock-take. Never edit stock to &ldquo;fix&rdquo; a number: use a count or a write-off so there&apos;s a record.</p>
        </CardContent></Card>
      </div>
    </div>
  );
}
