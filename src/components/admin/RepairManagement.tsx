import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, Pencil, Trash2, Check, X, ToggleLeft, ToggleRight, Eye } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Link } from "react-router-dom";
import { useServices, ServiceBooking } from "@/contexts/ServicesContext";
import { toast } from "sonner";

const STATUSES: ServiceBooking["status"][] = [
  "Received", "Diagnostic", "Awaiting Parts", "In Repair", "Ready for Pickup", "Completed",
];

const STATUS_VARIANT: Record<ServiceBooking["status"], "default" | "secondary" | "outline" | "destructive"> = {
  Received: "secondary",
  Diagnostic: "outline",
  "Awaiting Parts": "secondary",
  "In Repair": "outline",
  "Ready for Pickup": "default",
  Completed: "default",
};

const RepairManagement = () => {
  const { services, updateServicePrice, toggleService, bookings, updateBooking, deleteBooking } = useServices();
  const [search, setSearch] = useState("");
  const [editingBooking, setEditingBooking] = useState<ServiceBooking | null>(null);
  const [editingPriceId, setEditingPriceId] = useState<string | null>(null);
  const [priceInput, setPriceInput] = useState("");

  const filtered = bookings.filter(b =>
    b.id.toLowerCase().includes(search.toLowerCase()) ||
    b.customerName.toLowerCase().includes(search.toLowerCase()) ||
    b.deviceBrand.toLowerCase().includes(search.toLowerCase()) ||
    b.serviceTitle.toLowerCase().includes(search.toLowerCase())
  );

  function startEditPrice(id: string, current: number) {
    setEditingPriceId(id);
    setPriceInput(String(current));
  }

  function savePrice(id: string) {
    const val = Number(priceInput);
    if (isNaN(val) || val < 0) { toast.error("Invalid price"); return; }
    updateServicePrice(id, val);
    setEditingPriceId(null);
    toast.success("Price updated");
  }

  function saveBookingEdit() {
    if (!editingBooking) return;
    updateBooking(editingBooking.id, editingBooking);
    setEditingBooking(null);
    toast.success("Repair ticket updated");
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-heading font-bold">Service & Repair Management</h1>

      <Tabs defaultValue="bookings">
        <TabsList>
          <TabsTrigger value="bookings">Repair Tickets ({bookings.length})</TabsTrigger>
          <TabsTrigger value="services">Manage Services</TabsTrigger>
        </TabsList>

        {/* ── Repair Tickets ── */}
        <TabsContent value="bookings" className="space-y-4 mt-4">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search by ticket, customer, device..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
          </div>

          <Card>
            <CardContent className="p-0">
              {filtered.length === 0 ? (
                <p className="text-muted-foreground text-sm text-center py-10">
                  {bookings.length === 0 ? "No repair bookings yet. Customers can book via the website." : "No results match your search."}
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Ticket</TableHead>
                        <TableHead>Customer</TableHead>
                        <TableHead>Phone</TableHead>
                        <TableHead>Device</TableHead>
                        <TableHead>Service</TableHead>
                        <TableHead>Technician</TableHead>
                        <TableHead>Est. Cost</TableHead>
                        <TableHead>Submitted</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filtered.map(b => (
                        <TableRow key={b.id}>
                          <TableCell className="font-mono text-xs font-bold text-primary">{b.id}</TableCell>
                          <TableCell className="font-medium whitespace-nowrap">{b.customerName}</TableCell>
                          <TableCell className="text-sm">{b.phone}</TableCell>
                          <TableCell className="text-sm">{b.deviceBrand} {b.deviceModel}</TableCell>
                          <TableCell className="text-sm">{b.serviceTitle}</TableCell>
                          <TableCell className="text-sm">{b.technician}</TableCell>
                          <TableCell className="text-sm">
                            {b.estimatedCost ? `KES ${b.estimatedCost.toLocaleString()}` : "—"}
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground whitespace-nowrap">{b.submittedAt}</TableCell>
                          <TableCell>
                            <Badge variant={STATUS_VARIANT[b.status]}>{b.status}</Badge>
                          </TableCell>
                          <TableCell className="text-right space-x-1">
                            <Button variant="ghost" size="sm" asChild>
                              <Link to={`/admin/tickets/${b.id}`}><Eye className="h-3.5 w-3.5" /></Link>
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => setEditingBooking({ ...b })}>
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => { deleteBooking(b.id); toast.success("Ticket deleted"); }}>
                              <Trash2 className="h-3.5 w-3.5 text-destructive" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Manage Services ── */}
        <TabsContent value="services" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Service Catalogue</CardTitle>
              <p className="text-sm text-muted-foreground">Edit prices and toggle services on/off. Changes reflect immediately on the website.</p>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Service</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Starting Price (KES)</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {services.map(svc => (
                    <TableRow key={svc.id}>
                      <TableCell className="font-medium whitespace-nowrap">{svc.title}</TableCell>
                      <TableCell className="text-sm text-muted-foreground max-w-[220px]">{svc.desc}</TableCell>
                      <TableCell>
                        {editingPriceId === svc.id ? (
                          <div className="flex items-center gap-1">
                            <Input
                              type="number"
                              value={priceInput}
                              onChange={e => setPriceInput(e.target.value)}
                              className="h-7 w-28"
                              autoFocus
                              onKeyDown={e => { if (e.key === "Enter") savePrice(svc.id); if (e.key === "Escape") setEditingPriceId(null); }}
                            />
                            <Button size="sm" variant="ghost" onClick={() => savePrice(svc.id)}><Check className="h-4 w-4 text-green-500" /></Button>
                            <Button size="sm" variant="ghost" onClick={() => setEditingPriceId(null)}><X className="h-4 w-4" /></Button>
                          </div>
                        ) : (
                          <span className="font-medium">KES {svc.priceFrom.toLocaleString()}</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant={svc.active ? "default" : "secondary"}>
                          {svc.active ? "Active" : "Hidden"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right space-x-1">
                        <Button size="sm" variant="ghost" onClick={() => startEditPrice(svc.id, svc.priceFrom)}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => { toggleService(svc.id); toast.success(`${svc.title} ${svc.active ? "hidden" : "shown"} on website`); }}>
                          {svc.active
                            ? <ToggleRight className="h-4 w-4 text-primary" />
                            : <ToggleLeft className="h-4 w-4 text-muted-foreground" />
                          }
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Edit Booking Dialog */}
      <Dialog open={!!editingBooking} onOpenChange={open => { if (!open) setEditingBooking(null); }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Ticket — {editingBooking?.id}</DialogTitle>
          </DialogHeader>
          {editingBooking && (
            <div className="space-y-4 pt-2">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Status</Label>
                  <Select value={editingBooking.status} onValueChange={v => setEditingBooking({ ...editingBooking, status: v as ServiceBooking["status"] })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Technician</Label>
                  <Input value={editingBooking.technician} onChange={e => setEditingBooking({ ...editingBooking, technician: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label>Estimated Cost (KES)</Label>
                  <Input type="number" value={editingBooking.estimatedCost ?? ""} onChange={e => setEditingBooking({ ...editingBooking, estimatedCost: e.target.value ? Number(e.target.value) : null })} />
                </div>
                <div className="space-y-1.5">
                  <Label>Customer Phone</Label>
                  <Input value={editingBooking.phone} onChange={e => setEditingBooking({ ...editingBooking, phone: e.target.value })} />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Internal Notes</Label>
                <Textarea rows={3} value={editingBooking.notes} onChange={e => setEditingBooking({ ...editingBooking, notes: e.target.value })} placeholder="Notes visible to customer when they track their ticket..." />
              </div>
              <div className="flex gap-3">
                <Button variant="outline" className="flex-1" onClick={() => setEditingBooking(null)}>Cancel</Button>
                <Button className="flex-1" onClick={saveBookingEdit}>Save Changes</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default RepairManagement;
