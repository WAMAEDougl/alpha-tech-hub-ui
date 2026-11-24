import { useState } from "react";
import { Search, Send, CheckCircle2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { useServices, ServiceItem } from "@/contexts/ServicesContext";

const STATUS_VARIANT: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
  Received: "secondary",
  Diagnostic: "outline",
  "Awaiting Parts": "secondary",
  "In Repair": "outline",
  "Ready for Pickup": "default",
  Completed: "default",
};

const ServicesSection = () => {
  const { services, addBooking, findBooking } = useServices();
  const activeServices = services.filter(s => s.active);

  // Booking modal state
  const [selectedService, setSelectedService] = useState<ServiceItem | null>(null);
  const [customerName, setCustomerName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [deviceBrand, setDeviceBrand] = useState("");
  const [deviceModel, setDeviceModel] = useState("");
  const [problemDesc, setProblemDesc] = useState("");
  const [bookingDone, setBookingDone] = useState(false);
  const [ticketId, setTicketId] = useState("");

  // Tracker state
  const [ticketInput, setTicketInput] = useState("");
  const [trackedBooking, setTrackedBooking] = useState<ReturnType<typeof findBooking>>(undefined);
  const [trackAttempted, setTrackAttempted] = useState(false);

  function openBooking(service: ServiceItem) {
    setSelectedService(service);
    setBookingDone(false);
    setCustomerName(""); setPhone(""); setEmail("");
    setDeviceBrand(""); setDeviceModel(""); setProblemDesc("");
  }

  function handleBookingSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!customerName || !phone || !deviceBrand || !problemDesc) {
      toast.error("Please fill in all required fields");
      return;
    }
    const id = addBooking({
      customerName, phone, email,
      deviceBrand, deviceModel,
      serviceId: selectedService!.id,
      serviceTitle: selectedService!.title,
      problemDesc,
    });
    setTicketId(id);
    setBookingDone(true);
    toast.success(`Booking confirmed! Your ticket is ${id}`);
  }

  function handleTrack() {
    if (!ticketInput.trim()) { toast.error("Please enter a ticket number"); return; }
    const found = findBooking(ticketInput.trim());
    setTrackedBooking(found);
    setTrackAttempted(true);
    if (!found) toast.error("Ticket not found. Please check the number and try again.");
  }

  return (
    <section id="services" className="py-16">
      <div className="container mx-auto px-4">
        <h2 className="text-3xl md:text-4xl font-heading font-bold text-center mb-2">Our Services</h2>
        <p className="text-muted-foreground text-center mb-10">Expert repair and maintenance for all your tech needs</p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
          {activeServices.map((service, i) => (
            <motion.div
              key={service.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              viewport={{ once: true }}
            >
              <Card className="h-full hover:shadow-lg transition-shadow group">
                <CardContent className="p-6 flex flex-col h-full">
                  <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                    <service.icon className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="font-heading font-semibold text-xl mb-2">{service.title}</h3>
                  <p className="text-muted-foreground text-sm mb-3 flex-1">{service.desc}</p>
                  <p className="text-primary font-semibold mb-4">From KES {service.priceFrom.toLocaleString()}</p>
                  <Button className="w-full min-h-[44px]" onClick={() => openBooking(service)}>
                    BOOK THIS SERVICE
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Repair Status Tracker */}
        <Card className="max-w-2xl mx-auto">
          <CardContent className="p-6">
            <h3 className="font-heading font-semibold text-xl mb-4 text-center">Track Your Repair</h3>
            <div className="flex flex-col sm:flex-row gap-2 mb-4">
              <Input
                placeholder="Enter your ticket number (e.g. SVC-0001)"
                className="flex-1 min-h-[44px]"
                value={ticketInput}
                onChange={e => { setTicketInput(e.target.value); setTrackAttempted(false); setTrackedBooking(undefined); }}
                onKeyDown={e => e.key === "Enter" && handleTrack()}
              />
              <Button className="min-h-[44px]" onClick={handleTrack}>
                <Search className="h-4 w-4 mr-2" /> Track
              </Button>
            </div>

            {trackAttempted && !trackedBooking && (
              <p className="text-sm text-destructive text-center">No ticket found with that number.</p>
            )}

            {trackedBooking && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="border rounded-xl p-4 space-y-3"
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono font-bold text-primary">{trackedBooking.id}</span>
                  <Badge variant={STATUS_VARIANT[trackedBooking.status] ?? "secondary"}>
                    {trackedBooking.status}
                  </Badge>
                </div>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div><p className="text-muted-foreground text-xs">Service</p><p className="font-medium">{trackedBooking.serviceTitle}</p></div>
                  <div><p className="text-muted-foreground text-xs">Device</p><p className="font-medium">{trackedBooking.deviceBrand} {trackedBooking.deviceModel}</p></div>
                  <div><p className="text-muted-foreground text-xs">Technician</p><p className="font-medium">{trackedBooking.technician}</p></div>
                  <div><p className="text-muted-foreground text-xs">Submitted</p><p className="font-medium">{trackedBooking.submittedAt}</p></div>
                  {trackedBooking.estimatedCost && (
                    <div><p className="text-muted-foreground text-xs">Estimated Cost</p><p className="font-medium text-primary">KES {trackedBooking.estimatedCost.toLocaleString()}</p></div>
                  )}
                  {trackedBooking.notes && (
                    <div className="col-span-2"><p className="text-muted-foreground text-xs">Notes</p><p className="font-medium">{trackedBooking.notes}</p></div>
                  )}
                </div>
              </motion.div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Booking Modal */}
      <Dialog open={!!selectedService} onOpenChange={open => { if (!open) setSelectedService(null); }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {bookingDone ? "Booking Confirmed!" : `Book: ${selectedService?.title}`}
            </DialogTitle>
          </DialogHeader>

          {bookingDone ? (
            <div className="flex flex-col items-center gap-4 py-6 text-center">
              <CheckCircle2 className="h-16 w-16 text-green-500" />
              <div>
                <p className="text-lg font-semibold mb-1">Your ticket number is:</p>
                <p className="text-3xl font-mono font-bold text-primary">{ticketId}</p>
              </div>
              <p className="text-muted-foreground text-sm">
                Save this number to track your repair status. We'll contact you on <strong>{phone}</strong> to confirm your appointment.
              </p>
              <Button onClick={() => setSelectedService(null)}>Done</Button>
            </div>
          ) : (
            <form onSubmit={handleBookingSubmit} className="space-y-4 pt-2">
              <div className="bg-primary/5 rounded-lg p-3 text-sm">
                <span className="font-medium">{selectedService?.title}</span>
                <span className="text-muted-foreground ml-2">— From KES {selectedService?.priceFrom.toLocaleString()}</span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5 col-span-2 sm:col-span-1">
                  <Label>Full Name <span className="text-primary">*</span></Label>
                  <Input placeholder="John Doe" value={customerName} onChange={e => setCustomerName(e.target.value)} />
                </div>
                <div className="space-y-1.5 col-span-2 sm:col-span-1">
                  <Label>Phone <span className="text-primary">*</span></Label>
                  <Input placeholder="+254 700 000 000" value={phone} onChange={e => setPhone(e.target.value)} />
                </div>
                <div className="space-y-1.5 col-span-2">
                  <Label>Email <span className="text-muted-foreground text-xs">(optional)</span></Label>
                  <Input type="email" placeholder="you@example.com" value={email} onChange={e => setEmail(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label>Device Brand <span className="text-primary">*</span></Label>
                  <Input placeholder="e.g. HP, Dell, Lenovo" value={deviceBrand} onChange={e => setDeviceBrand(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label>Device Model <span className="text-muted-foreground text-xs">(optional)</span></Label>
                  <Input placeholder="e.g. Pavilion 15" value={deviceModel} onChange={e => setDeviceModel(e.target.value)} />
                </div>
                <div className="space-y-1.5 col-span-2">
                  <Label>Describe the Problem <span className="text-primary">*</span></Label>
                  <Textarea rows={3} placeholder="What's wrong with your device?" value={problemDesc} onChange={e => setProblemDesc(e.target.value)} />
                </div>
              </div>

              <div className="flex gap-3 pt-1">
                <Button type="button" variant="outline" className="flex-1" onClick={() => setSelectedService(null)}>Cancel</Button>
                <Button type="submit" className="flex-1 gap-2"><Send className="h-4 w-4" /> Confirm Booking</Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </section>
  );
};

export default ServicesSection;
