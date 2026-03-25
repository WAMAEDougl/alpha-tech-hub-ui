import { useParams, Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Upload } from "lucide-react";
import logoRed from "@/assets/logo-red.png";
import logoBlack from "@/assets/logo-black.png";

const ticketData: Record<string, {
  id: string; customer: string; phone: string; device: string; service: string;
  status: string; date: string; tech: string; notes: string; parts: string[];
}> = {
  "RPR-001": { id: "RPR-001", customer: "James Kamau", phone: "+254 712 345 678", device: "HP Pavilion 15", service: "Screen Replacement", status: "Awaiting Parts", date: "2026-03-22", tech: "Evans", notes: "Screen cracked on top-left. Ordered 15.6\" FHD IPS panel. ETA 3 days.", parts: ["15.6\" FHD IPS LCD Panel", "Screen adhesive strips"] },
  "RPR-002": { id: "RPR-002", customer: "Grace Muthoni", phone: "+254 723 456 789", device: "Dell Inspiron 14", service: "Hardware Diagnostic", status: "Diagnostic", date: "2026-03-23", tech: "Brian", notes: "Customer reports random shutdowns. Running thermal and stress tests.", parts: [] },
  "RPR-003": { id: "RPR-003", customer: "Samuel Njoroge", phone: "+254 734 567 890", device: "Lenovo IdeaPad", service: "OS Installation", status: "Repaired", date: "2026-03-20", tech: "Evans", notes: "Fresh Windows 11 install. Drivers installed. Activated.", parts: ["Windows 11 Pro license"] },
  "RPR-004": { id: "RPR-004", customer: "Mary Akinyi", phone: "+254 745 678 901", device: "MacBook Air M2", service: "Data Recovery", status: "Ready for Pickup", date: "2026-03-18", tech: "Brian", notes: "Recovered 95% of files from failing SSD. Data backed up to external.", parts: ["External 1TB HDD"] },
  "RPR-005": { id: "RPR-005", customer: "Tom Ochieng", phone: "+254 756 789 012", device: "ASUS VivoBook", service: "Virus Removal", status: "Diagnostic", date: "2026-03-24", tech: "Evans", notes: "Multiple adware infections detected. Full scan in progress.", parts: [] },
};

const RepairTicketView = () => {
  const { ticketId } = useParams();
  const ticket = ticketData[ticketId || "RPR-001"] || ticketData["RPR-001"];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" asChild>
          <Link to="/admin/repairs"><ArrowLeft className="h-4 w-4 mr-1" /> Back</Link>
        </Button>
        <h1 className="text-2xl font-heading font-bold">Repair Ticket: {ticket.id}</h1>
        <Badge variant="secondary" className="ml-auto">{ticket.status}</Badge>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader><CardTitle>Customer Information</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-2 gap-4 text-sm">
              <div><span className="text-muted-foreground">Name:</span><p className="font-medium">{ticket.customer}</p></div>
              <div><span className="text-muted-foreground">Phone:</span><p className="font-medium">{ticket.phone}</p></div>
              <div><span className="text-muted-foreground">Device:</span><p className="font-medium">{ticket.device}</p></div>
              <div><span className="text-muted-foreground">Service:</span><p className="font-medium">{ticket.service}</p></div>
              <div><span className="text-muted-foreground">Date Received:</span><p className="font-medium">{ticket.date}</p></div>
              <div><span className="text-muted-foreground">Technician:</span><p className="font-medium">{ticket.tech}</p></div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Technician Notes</CardTitle></CardHeader>
            <CardContent>
              <Textarea defaultValue={ticket.notes} rows={4} />
              <Button className="mt-3" size="sm">Save Notes</Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Parts Used</CardTitle></CardHeader>
            <CardContent>
              {ticket.parts.length > 0 ? (
                <ul className="space-y-1">
                  {ticket.parts.map((part, i) => (
                    <li key={i} className="text-sm flex items-center gap-2">
                      <span className="h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
                      {part}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted-foreground">No parts recorded yet.</p>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader><CardTitle>Update Status</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <Select defaultValue={ticket.status}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Diagnostic">Diagnostic</SelectItem>
                  <SelectItem value="Awaiting Parts">Awaiting Parts</SelectItem>
                  <SelectItem value="Repaired">Repaired</SelectItem>
                  <SelectItem value="Ready for Pickup">Ready for Pickup</SelectItem>
                </SelectContent>
              </Select>
              <Button className="w-full">Update Status</Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Repair Photos</CardTitle></CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-2 mb-3">
                <img src={logoRed} alt="Repair" className="rounded-md border bg-card p-2 aspect-square object-contain" />
                <img src={logoBlack} alt="Repair" className="rounded-md border bg-card p-2 aspect-square object-contain" />
              </div>
              <Button variant="outline" className="w-full" size="sm">
                <Upload className="h-4 w-4 mr-2" /> Upload Photo
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default RepairTicketView;
