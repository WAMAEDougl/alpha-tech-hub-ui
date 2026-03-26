import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Plus, X, ImagePlus } from "lucide-react";
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

const RepairTicketView = () => {
  const { ticketId } = useParams<{ ticketId: string }>();
  const { bookings, updateBooking } = useServices();

  const booking = bookings.find(b => b.id === ticketId);

  // Local editable state
  const [status, setStatus] = useState<ServiceBooking["status"]>(booking?.status ?? "Received");
  const [technician, setTechnician] = useState(booking?.technician ?? "");
  const [estimatedCost, setEstimatedCost] = useState(booking?.estimatedCost?.toString() ?? "");
  const [notes, setNotes] = useState(booking?.notes ?? "");
  const [parts, setParts] = useState<string[]>([]);
  const [newPart, setNewPart] = useState("");
  const [photos, setPhotos] = useState<string[]>([]);

  function handleSave() {
    if (!booking) return;
    updateBooking(booking.id, {
      status,
      technician,
      estimatedCost: estimatedCost ? Number(estimatedCost) : null,
      notes,
    });
    toast.success("Ticket updated successfully");
  }

  function addPart() {
    if (!newPart.trim()) return;
    setParts(prev => [...prev, newPart.trim()]);
    setNewPart("");
  }

  function removePart(i: number) {
    setParts(prev => prev.filter((_, idx) => idx !== i));
  }

  function handlePhotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    files.forEach(file => {
      const reader = new FileReader();
      reader.onload = () => setPhotos(prev => [...prev, reader.result as string]);
      reader.readAsDataURL(file);
    });
    e.target.value = "";
  }

  // Not found state
  if (!booking) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" size="sm" asChild>
          <Link to="/admin/repairs"><ArrowLeft className="h-4 w-4 mr-1" /> Back to Repairs</Link>
        </Button>
        <div className="text-center py-20">
          <p className="text-2xl font-bold mb-2">Ticket Not Found</p>
          <p className="text-muted-foreground mb-4">
            No ticket with ID <span className="font-mono text-primary">{ticketId}</span> exists.
          </p>
          <p className="text-sm text-muted-foreground">
            Tickets are created when customers book a service on the website.
          </p>
          <Button asChild className="mt-6">
            <Link to="/admin/repairs">View All Repairs</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center gap-4">
        <Button variant="ghost" size="sm" asChild>
          <Link to="/admin/repairs"><ArrowLeft className="h-4 w-4 mr-1" /> Back</Link>
        </Button>
        <h1 className="text-2xl font-heading font-bold">Ticket: {booking.id}</h1>
        <Badge variant={STATUS_VARIANT[status]} className="ml-auto">{status}</Badge>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left — main info */}
        <div className="lg:col-span-2 space-y-6">

          {/* Customer & Device */}
          <Card>
            <CardHeader><CardTitle>Customer & Device</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              <div><p className="text-muted-foreground text-xs mb-0.5">Customer Name</p><p className="font-medium">{booking.customerName}</p></div>
              <div><p className="text-muted-foreground text-xs mb-0.5">Phone</p><p className="font-medium">{booking.phone}</p></div>
              {booking.email && <div><p className="text-muted-foreground text-xs mb-0.5">Email</p><p className="font-medium">{booking.email}</p></div>}
              <div><p className="text-muted-foreground text-xs mb-0.5">Device</p><p className="font-medium">{booking.deviceBrand} {booking.deviceModel}</p></div>
              <div><p className="text-muted-foreground text-xs mb-0.5">Service</p><p className="font-medium">{booking.serviceTitle}</p></div>
              <div><p className="text-muted-foreground text-xs mb-0.5">Submitted</p><p className="font-medium">{booking.submittedAt}</p></div>
              <div className="sm:col-span-2">
                <p className="text-muted-foreground text-xs mb-0.5">Problem Description</p>
                <p className="font-medium">{booking.problemDesc}</p>
              </div>
            </CardContent>
          </Card>

          {/* Technician Notes */}
          <Card>
            <CardHeader><CardTitle>Technician Notes</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <Textarea
                rows={4}
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="Add notes visible to the customer when they track their ticket..."
              />
            </CardContent>
          </Card>

          {/* Parts Used */}
          <Card>
            <CardHeader><CardTitle>Parts Used</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {parts.length > 0 && (
                <ul className="space-y-1.5 mb-3">
                  {parts.map((part, i) => (
                    <li key={i} className="flex items-center justify-between text-sm bg-muted/50 rounded-md px-3 py-1.5">
                      <span className="flex items-center gap-2">
                        <span className="h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
                        {part}
                      </span>
                      <button onClick={() => removePart(i)} className="text-muted-foreground hover:text-destructive transition-colors">
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              <div className="flex gap-2">
                <Input
                  placeholder='Add a part (e.g. 15.6" FHD IPS screen)'
                  value={newPart}
                  onChange={e => setNewPart(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && addPart()}
                  className="flex-1"
                />
                <Button variant="outline" size="icon" onClick={addPart}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Repair Photos */}
          <Card>
            <CardHeader><CardTitle>Repair Photos</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {photos.length > 0 && (
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                  {photos.map((src, i) => (
                    <div key={i} className="relative group">
                      <img src={src} alt={`repair-${i}`} className="w-full aspect-square object-cover rounded-lg border" />
                      <button
                        onClick={() => setPhotos(prev => prev.filter((_, idx) => idx !== i))}
                        className="absolute top-1 right-1 bg-black/60 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <label className="flex items-center gap-2 cursor-pointer border-2 border-dashed rounded-lg p-3 hover:bg-muted/50 transition-colors">
                <ImagePlus className="h-5 w-5 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Upload repair photos</span>
                <input type="file" accept="image/*" multiple className="hidden" onChange={handlePhotoUpload} />
              </label>
            </CardContent>
          </Card>
        </div>

        {/* Right — actions */}
        <div className="space-y-6">
          <Card>
            <CardHeader><CardTitle>Update Ticket</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label>Status</Label>
                <Select value={status} onValueChange={v => setStatus(v as ServiceBooking["status"])}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label>Assigned Technician</Label>
                <Input
                  placeholder="Technician name"
                  value={technician}
                  onChange={e => setTechnician(e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <Label>Estimated Cost (KES)</Label>
                <Input
                  type="number"
                  placeholder="e.g. 5000"
                  value={estimatedCost}
                  onChange={e => setEstimatedCost(e.target.value)}
                />
              </div>

              <Button className="w-full" onClick={handleSave}>
                Save Changes
              </Button>
            </CardContent>
          </Card>

          {/* Summary card */}
          <Card>
            <CardHeader><CardTitle>Ticket Summary</CardTitle></CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Ticket ID</span>
                <span className="font-mono font-bold text-primary">{booking.id}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Service</span>
                <span className="font-medium">{booking.serviceTitle}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Parts Used</span>
                <span className="font-medium">{parts.length}</span>
              </div>
              {estimatedCost && (
                <div className="flex justify-between border-t pt-2 mt-2">
                  <span className="text-muted-foreground">Estimated Cost</span>
                  <span className="font-bold text-primary">KES {Number(estimatedCost).toLocaleString()}</span>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default RepairTicketView;
