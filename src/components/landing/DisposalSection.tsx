import { useState } from "react";
import { motion } from "framer-motion";
import { Recycle, ShieldCheck, Leaf, Truck, Send, CheckCircle2, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useDisposal } from "@/contexts/DisposalContext";
import { toast } from "sonner";

const benefits = [
  {
    icon: ShieldCheck,
    title: "Secure Data Destruction",
    desc: "All storage devices are wiped or physically destroyed — your data never leaves our hands.",
    color: "text-blue-500",
    bg: "bg-blue-500/10",
  },
  {
    icon: Leaf,
    title: "Eco-Friendly Disposal",
    desc: "We partner with certified recyclers to ensure zero harmful e-waste reaches landfills.",
    color: "text-green-500",
    bg: "bg-green-500/10",
  },
  {
    icon: Recycle,
    title: "Parts Recovery",
    desc: "Usable components are refurbished and resold, reducing electronic waste.",
    color: "text-primary",
    bg: "bg-primary/10",
  },
  {
    icon: Truck,
    title: "Drop-Off Service",
    desc: "Simply bring your old devices to our Nanyuki store — no appointment needed for small quantities.",
    color: "text-orange-500",
    bg: "bg-orange-500/10",
  },
];

const acceptedItems = [
  "Desktop computers & towers",
  "Laptops & notebooks",
  "Monitors & displays",
  "Printers & scanners",
  "Keyboards, mice & peripherals",
  "Hard drives & SSDs",
  "Phones & tablets",
  "Networking equipment",
  "Power supplies & UPS units",
  "Cables & adapters",
];

const DisposalSection = () => {
  const { addRequest } = useDisposal();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [items, setItems] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [preferredDate, setPreferredDate] = useState("");
  const [notes, setNotes] = useState("");
  const [submitted, setSubmitted] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name || !phone || !items) {
      toast.error("Please fill in your name, phone and item description");
      return;
    }
    addRequest({ name, phone, email, items, quantity, preferredDate, notes });
    setSubmitted(true);
    toast.success("Disposal request submitted! We'll confirm within 24 hours.");
  }

  if (submitted) {
    return (
      <section id="disposal" className="py-16">
        <div className="container mx-auto px-4 max-w-xl text-center">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.5 }}
            className="flex flex-col items-center gap-4"
          >
            <CheckCircle2 className="h-20 w-20 text-green-500" />
            <h2 className="text-2xl font-heading font-bold">Request Received!</h2>
            <p className="text-muted-foreground">
              Thanks <strong>{name}</strong>! We'll confirm your disposal drop-off on <strong>{phone}</strong> within 24 hours.
              {preferredDate && <> Your preferred date is <strong>{preferredDate}</strong>.</>}
            </p>
            <Button onClick={() => { setSubmitted(false); setName(""); setPhone(""); setEmail(""); setItems(""); setQuantity(1); setPreferredDate(""); setNotes(""); }}>
              Submit Another Request
            </Button>
          </motion.div>
        </div>
      </section>
    );
  }

  return (
    <section id="disposal" className="py-16">
      <div className="container mx-auto px-4">

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <div className="inline-flex items-center gap-2 bg-green-500/10 text-green-600 dark:text-green-400 px-4 py-1.5 rounded-full text-sm font-medium mb-4">
            <Recycle className="h-4 w-4" /> Responsible E-Waste Disposal
          </div>
          <h2 className="text-3xl md:text-4xl font-heading font-bold mb-3">
            Dispose Your Old <span className="text-primary">Electronics</span>
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Don't let old computers collect dust or end up in a landfill. Bring them to Alpha Computers Nanyuki
            for safe, secure, and eco-friendly disposal — we handle everything from data destruction to recycling.
          </p>
        </motion.div>

        {/* Benefits */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-14">
          {benefits.map((b, i) => (
            <motion.div
              key={b.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              viewport={{ once: true }}
            >
              <Card className="h-full hover:shadow-md transition-shadow">
                <CardContent className="p-5 flex flex-col gap-3">
                  <div className={`h-11 w-11 rounded-xl ${b.bg} flex items-center justify-center`}>
                    <b.icon className={`h-5 w-5 ${b.color}`} />
                  </div>
                  <p className="font-heading font-semibold">{b.title}</p>
                  <p className="text-sm text-muted-foreground">{b.desc}</p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">

          {/* Accepted items list */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
          >
            <h3 className="font-heading font-bold text-xl mb-4">What We Accept</h3>
            <ul className="space-y-2">
              {acceptedItems.map(item => (
                <li key={item} className="flex items-center gap-2 text-sm">
                  <span className="h-1.5 w-1.5 rounded-full bg-green-500 shrink-0" />
                  {item}
                </li>
              ))}
            </ul>

            <div className="mt-6 p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 flex gap-3">
              <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="font-semibold text-amber-700 dark:text-amber-400 mb-1">Please Note</p>
                <p className="text-muted-foreground">
                  For large quantities (10+ items) or bulky equipment, please schedule a drop-off in advance
                  using the form so we can prepare adequate space and staff.
                </p>
              </div>
            </div>
          </motion.div>

          {/* Request form */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
          >
            <h3 className="font-heading font-bold text-xl mb-4">Schedule a Drop-Off</h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="disp-name">Full Name <span className="text-primary">*</span></Label>
                  <Input id="disp-name" placeholder="John Doe" value={name} onChange={e => setName(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="disp-phone">Phone / WhatsApp <span className="text-primary">*</span></Label>
                  <Input id="disp-phone" placeholder="+254 700 000 000" value={phone} onChange={e => setPhone(e.target.value)} />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="disp-email">Email <span className="text-muted-foreground text-sm font-normal">(optional)</span></Label>
                <Input id="disp-email" type="email" placeholder="you@example.com" value={email} onChange={e => setEmail(e.target.value)} />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="disp-items">What are you bringing? <span className="text-primary">*</span></Label>
                <Input id="disp-items" placeholder="e.g. 2 old laptops, 1 desktop tower, 3 monitors" value={items} onChange={e => setItems(e.target.value)} />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="disp-qty">Approximate Quantity</Label>
                  <Input id="disp-qty" type="number" min={1} value={quantity} onChange={e => setQuantity(Number(e.target.value))} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="disp-date">Preferred Drop-Off Date <span className="text-muted-foreground text-sm font-normal">(optional)</span></Label>
                  <Input id="disp-date" type="date" value={preferredDate} onChange={e => setPreferredDate(e.target.value)} min={new Date().toISOString().split("T")[0]} />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="disp-notes">Additional Notes <span className="text-muted-foreground text-sm font-normal">(optional)</span></Label>
                <Textarea id="disp-notes" rows={3} placeholder="Any special requirements or questions..." value={notes} onChange={e => setNotes(e.target.value)} />
              </div>

              <Button type="submit" size="lg" className="w-full min-h-[48px] font-heading font-semibold gap-2">
                <Send className="h-5 w-5" /> Schedule Drop-Off
              </Button>
              <p className="text-xs text-muted-foreground text-center">
                Walk-ins welcome for small quantities. We're open Mon–Fri 8am–6pm, Sat 9am–4pm.
              </p>
            </form>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default DisposalSection;
