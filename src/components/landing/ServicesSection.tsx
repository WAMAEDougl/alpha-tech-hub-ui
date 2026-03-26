import { Wrench, Monitor, HardDrive, Wifi, Search, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { motion } from "framer-motion";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

const services = [
  { icon: Wrench, title: "Hardware Diagnostic", desc: "Full system diagnostics and troubleshooting for all brands", price: "From KES 1,500" },
  { icon: Monitor, title: "OS Installation", desc: "Windows, Linux, or macOS setup with driver installation", price: "From KES 2,000" },
  { icon: HardDrive, title: "Data Recovery", desc: "Recover lost files from damaged drives and storage media", price: "From KES 3,500" },
  { icon: Wifi, title: "Network Setup", desc: "Home & office network configuration, WiFi optimization", price: "From KES 2,500" },
  { icon: Shield, title: "Virus Removal", desc: "Complete malware scan, removal, and security hardening", price: "From KES 1,500" },
  { icon: Monitor, title: "Screen Replacement", desc: "Laptop screen replacement for all major brands", price: "From KES 5,000" },
];

const ServicesSection = () => {
  const [ticketNumber, setTicketNumber] = useState("");
  const navigate = useNavigate();

  function handleBookService() {
    const el = document.querySelector("#contact");
    if (el) el.scrollIntoView({ behavior: "smooth" });
  }

  function handleTrackRepair() {
    if (!ticketNumber.trim()) {
      toast.error("Please enter a ticket number");
      return;
    }
    // Navigate to admin ticket view
    navigate(`/admin/tickets/${ticketNumber.trim()}`);
  }

  return (
    <section id="services" className="py-16">
      <div className="container mx-auto px-4">
        <h2 className="text-3xl md:text-4xl font-heading font-bold text-center mb-2">Our Services</h2>
        <p className="text-muted-foreground text-center mb-10">Expert repair and maintenance for all your tech needs</p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
          {services.map((service, i) => (
            <motion.div
              key={service.title}
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
                  <p className="text-primary font-semibold mb-4">{service.price}</p>
                  <Button className="w-full min-h-[44px]" onClick={handleBookService}>BOOK THIS SERVICE</Button>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Repair Status Tracker */}
        <Card className="max-w-xl mx-auto">
          <CardContent className="p-6">
            <h3 className="font-heading font-semibold text-xl mb-4 text-center">Track Your Repair</h3>
            <div className="flex flex-col sm:flex-row gap-2">
              <Input
                placeholder="Enter your repair ticket number"
                className="flex-1 min-h-[44px]"
                value={ticketNumber}
                onChange={(e) => setTicketNumber(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleTrackRepair()}
              />
              <Button className="min-h-[44px]" onClick={handleTrackRepair}>
                <Search className="h-4 w-4 mr-2" /> Track
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </section>
  );
};

export default ServicesSection;
