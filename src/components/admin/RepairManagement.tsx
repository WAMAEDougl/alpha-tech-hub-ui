import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Eye } from "lucide-react";
import { Link } from "react-router-dom";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";

const repairs = [
  { id: "RPR-001", customer: "James Kamau", device: "HP Pavilion 15", service: "Screen Replacement", status: "Awaiting Parts", date: "2026-03-22", tech: "Evans" },
  { id: "RPR-002", customer: "Grace Muthoni", device: "Dell Inspiron 14", service: "Hardware Diagnostic", status: "Diagnostic", date: "2026-03-23", tech: "Brian" },
  { id: "RPR-003", customer: "Samuel Njoroge", device: "Lenovo IdeaPad", service: "OS Installation", status: "Repaired", date: "2026-03-20", tech: "Evans" },
  { id: "RPR-004", customer: "Mary Akinyi", device: "MacBook Air M2", service: "Data Recovery", status: "Ready for Pickup", date: "2026-03-18", tech: "Brian" },
  { id: "RPR-005", customer: "Tom Ochieng", device: "ASUS VivoBook", service: "Virus Removal", status: "Diagnostic", date: "2026-03-24", tech: "Evans" },
];

const statusColor: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  Diagnostic: "outline",
  "Awaiting Parts": "secondary",
  Repaired: "default",
  "Ready for Pickup": "default",
};

const RepairManagement = () => {
  const [search, setSearch] = useState("");
  const filtered = repairs.filter(r =>
    r.id.toLowerCase().includes(search.toLowerCase()) ||
    r.customer.toLowerCase().includes(search.toLowerCase()) ||
    r.device.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-heading font-bold">Service & Repair Management</h1>
      <Card>
        <CardHeader className="pb-3">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search repairs..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Ticket</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Device</TableHead>
                <TableHead>Service</TableHead>
                <TableHead>Technician</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map(r => (
                <TableRow key={r.id}>
                  <TableCell className="font-mono text-xs">{r.id}</TableCell>
                  <TableCell className="font-medium">{r.customer}</TableCell>
                  <TableCell>{r.device}</TableCell>
                  <TableCell>{r.service}</TableCell>
                  <TableCell>{r.tech}</TableCell>
                  <TableCell>{r.date}</TableCell>
                  <TableCell><Badge variant={statusColor[r.status]}>{r.status}</Badge></TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm" asChild>
                      <Link to={`/admin/tickets/${r.id}`}><Eye className="h-3.5 w-3.5" /></Link>
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default RepairManagement;
