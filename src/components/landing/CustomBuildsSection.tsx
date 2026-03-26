import { useState } from "react";
import { motion } from "framer-motion";
import { Cpu, Monitor, Zap, Send, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { useCustomBuilds } from "@/contexts/CustomBuildsContext";

const buildTypes = [
  {
    icon: Zap,
    title: "Gaming PC",
    desc: "High-performance builds for gaming, streaming and content creation",
    color: "text-red-500",
    bg: "bg-red-500/10",
  },
  {
    icon: Cpu,
    title: "Workstation",
    desc: "Professional builds for video editing, 3D rendering and heavy workloads",
    color: "text-blue-500",
    bg: "bg-blue-500/10",
  },
  {
    icon: Monitor,
    title: "Home / Office",
    desc: "Reliable everyday builds for browsing, documents and light tasks",
    color: "text-green-500",
    bg: "bg-green-500/10",
  },
];

const useCases = [
  "Gaming", "Video Editing", "3D Rendering", "Programming",
  "Office Work", "Graphic Design", "Streaming", "General Use",
];

const CustomBuildsSection = () => {
  const { budgetRanges, addBuildRequest } = useCustomBuilds();
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [selectedBudget, setSelectedBudget] = useState<string | null>(null);
  const [selectedUses, setSelectedUses] = useState<string[]>([]);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [submitted, setSubmitted] = useState(false);

  function toggleUse(use: string) {
    setSelectedUses(prev =>
      prev.includes(use) ? prev.filter(u => u !== use) : [...prev, use]
    );
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedType || !selectedBudget || !name || !phone) {
      toast.error("Please fill in all required fields");
      return;
    }
    addBuildRequest({
      name,
      phone,
      buildType: selectedType,
      budget: selectedBudget,
      useCases: selectedUses,
      notes,
    });
    setSubmitted(true);
    toast.success("Build request submitted! We'll contact you within 24 hours.");
  }

  if (submitted) {
    return (
      <section id="custom-builds" className="py-16 bg-secondary/30">
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
              Thanks <strong>{name}</strong>! Our team will review your custom build request and
              reach out to you on <strong>{phone}</strong> within 24 hours with a detailed quote.
            </p>
            <Button onClick={() => { setSubmitted(false); setSelectedType(null); setSelectedBudget(null); setSelectedUses([]); setName(""); setPhone(""); setNotes(""); }}>
              Submit Another Request
            </Button>
          </motion.div>
        </div>
      </section>
    );
  }

  return (
    <section id="custom-builds" className="py-16 bg-secondary/30">
      <div className="container mx-auto px-4">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <h2 className="text-3xl md:text-4xl font-heading font-bold mb-3">
            Custom <span className="text-primary">PC Builds</span>
          </h2>
          <p className="text-muted-foreground max-w-xl mx-auto">
            Want a PC built exactly to your needs? Tell us your budget and use case — our
            technicians will hand-pick the best components and assemble it for you.
          </p>
        </motion.div>

        <form onSubmit={handleSubmit} className="max-w-3xl mx-auto space-y-8">

          {/* Step 1 — Build type */}
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.1 }}>
            <h3 className="font-heading font-semibold text-lg mb-4">
              1. What type of build do you need? <span className="text-primary">*</span>
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {buildTypes.map((type) => (
                <Card
                  key={type.title}
                  onClick={() => setSelectedType(type.title)}
                  className={`cursor-pointer transition-all duration-200 hover:shadow-md ${
                    selectedType === type.title
                      ? "border-primary ring-2 ring-primary/30"
                      : "hover:border-primary/40"
                  }`}
                >
                  <CardContent className="p-5 flex flex-col items-center text-center gap-3">
                    <div className={`h-12 w-12 rounded-xl ${type.bg} flex items-center justify-center`}>
                      <type.icon className={`h-6 w-6 ${type.color}`} />
                    </div>
                    <p className="font-heading font-semibold">{type.title}</p>
                    <p className="text-xs text-muted-foreground">{type.desc}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </motion.div>

          {/* Step 2 — Budget */}
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.15 }}>
            <h3 className="font-heading font-semibold text-lg mb-4">
              2. What is your budget? <span className="text-primary">*</span>
            </h3>
            <div className="flex flex-wrap gap-3">
              {budgetRanges.map((range) => (
                <button
                  key={range.id}
                  type="button"
                  onClick={() => setSelectedBudget(range.label)}
                  className={`px-4 py-2 rounded-full text-sm font-medium border transition-all duration-200 ${
                    selectedBudget === range.label
                      ? "bg-primary text-primary-foreground border-primary"
                      : "border-border hover:border-primary hover:text-primary"
                  }`}
                >
                  {range.label}
                </button>
              ))}
            </div>
          </motion.div>

          {/* Step 3 — Use cases */}
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.2 }}>
            <h3 className="font-heading font-semibold text-lg mb-4">
              3. What will you use it for? <span className="text-muted-foreground text-sm font-normal">(select all that apply)</span>
            </h3>
            <div className="flex flex-wrap gap-3">
              {useCases.map((use) => (
                <button
                  key={use}
                  type="button"
                  onClick={() => toggleUse(use)}
                  className={`px-4 py-2 rounded-full text-sm font-medium border transition-all duration-200 ${
                    selectedUses.includes(use)
                      ? "bg-primary text-primary-foreground border-primary"
                      : "border-border hover:border-primary hover:text-primary"
                  }`}
                >
                  {use}
                </button>
              ))}
            </div>
          </motion.div>

          {/* Step 4 — Contact */}
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.25 }}>
            <h3 className="font-heading font-semibold text-lg mb-4">
              4. Your contact details <span className="text-primary">*</span>
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="build-name">Full Name</Label>
                <Input
                  id="build-name"
                  placeholder="John Doe"
                  value={name}
                  onChange={e => setName(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="build-phone">Phone / WhatsApp</Label>
                <Input
                  id="build-phone"
                  placeholder="+254 700 000 000"
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-1.5 mt-4">
              <Label htmlFor="build-notes">Additional notes <span className="text-muted-foreground text-sm font-normal">(optional)</span></Label>
              <Textarea
                id="build-notes"
                placeholder="Any specific components, preferences or requirements..."
                rows={3}
                value={notes}
                onChange={e => setNotes(e.target.value)}
              />
            </div>
          </motion.div>

          {/* Submit */}
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.3 }}>
            <Button type="submit" size="lg" className="w-full min-h-[48px] font-heading font-semibold text-base gap-2">
              <Send className="h-5 w-5" /> Submit Build Request
            </Button>
            <p className="text-xs text-muted-foreground text-center mt-3">
              We'll review your request and contact you within 24 hours with a detailed quote.
            </p>
          </motion.div>

        </form>
      </div>
    </section>
  );
};

export default CustomBuildsSection;
