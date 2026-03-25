import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { useState } from "react";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";

const orders = [
  { id: "ORD-001", customer: "John Mwangi", items: 3, total: 198500, date: "2026-03-24", status: "Processing" },
  { id: "ORD-002", customer: "Jane Wanjiru", items: 1, total: 185000, date: "2026-03-23", status: "Shipped" },
  { id: "ORD-003", customer: "Peter Karanja", items: 2, total: 40500, date: "2026-03-22", status: "Delivered" },
  { id: "ORD-004", customer: "Alice Njeri", items: 1, total: 145000, date: "2026-03-21", status: "Ordered" },
  { id: "ORD-005", customer: "David Otieno", items: 4, total: 52000, date: "2026-03-20", status: "Processing" },
];

const statusColor: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  Ordered: "outline",
  Processing: "secondary",
  Shipped: "default",
  Delivered: "default",
};

const OrderManagement = () => {
  const [search, setSearch] = useState("");
  const filtered = orders.filter(o => o.id.toLowerCase().includes(search.toLowerCase()) || o.customer.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-heading font-bold">Order Management</h1>
      <Card>
        <CardHeader className="pb-3">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search orders..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Order ID</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Items</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map(o => (
                <TableRow key={o.id}>
                  <TableCell className="font-mono text-xs">{o.id}</TableCell>
                  <TableCell className="font-medium">{o.customer}</TableCell>
                  <TableCell>{o.items}</TableCell>
                  <TableCell>KES {o.total.toLocaleString()}</TableCell>
                  <TableCell>{o.date}</TableCell>
                  <TableCell><Badge variant={statusColor[o.status]}>{o.status}</Badge></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default OrderManagement;
