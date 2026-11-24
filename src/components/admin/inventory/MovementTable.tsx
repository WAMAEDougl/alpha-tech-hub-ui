import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export interface Movement {
  id: string; type: string; quantity: number; stockBefore: number; stockAfter: number;
  reason: string | null; reference: string | null; createdAt: string; productName: string; sku: string; by: string;
}

export const typeLabel: Record<string, string> = {
  RECEIVED: "Received", SALE: "Left the shop", RETURN: "Returned", ADJUSTMENT: "Stock-take", DAMAGED: "Written off",
};
const typeStyle: Record<string, string> = {
  RECEIVED: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
  RETURN: "bg-sky-500/15 text-sky-600 dark:text-sky-400",
  SALE: "bg-muted text-muted-foreground",
  ADJUSTMENT: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
  DAMAGED: "bg-destructive/15 text-destructive",
};

const when = (iso: string) => new Date(iso).toLocaleString("en-KE", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

export function MovementTable({ rows }: { rows: Movement[] }) {
  if (!rows.length) return <p className="p-6 text-sm text-muted-foreground text-center">No stock movements yet.</p>;
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>When</TableHead><TableHead>Product</TableHead><TableHead>Type</TableHead>
          <TableHead className="text-right">Qty</TableHead><TableHead className="text-right">Stock after</TableHead>
          <TableHead>Reason / ref</TableHead><TableHead>By</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map(m => (
          <TableRow key={m.id}>
            <TableCell className="whitespace-nowrap text-xs">{when(m.createdAt)}</TableCell>
            <TableCell><span className="font-medium">{m.productName}</span> <span className="text-xs text-muted-foreground">{m.sku}</span></TableCell>
            <TableCell><span className={`text-xs px-2 py-0.5 rounded-full ${typeStyle[m.type]}`}>{typeLabel[m.type] ?? m.type}</span></TableCell>
            <TableCell className={`text-right font-mono ${m.quantity > 0 ? "text-emerald-600 dark:text-emerald-400" : ""}`}>{m.quantity > 0 ? `+${m.quantity}` : m.quantity}</TableCell>
            <TableCell className="text-right font-mono">{m.stockAfter}</TableCell>
            <TableCell className="text-xs text-muted-foreground max-w-[260px] truncate" title={`${m.reason ?? ""} ${m.reference ?? ""}`}>{m.reason}{m.reference ? ` · ${m.reference}` : ""}</TableCell>
            <TableCell className="text-xs">{m.by}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
