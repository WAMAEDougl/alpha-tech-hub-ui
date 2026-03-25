import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import heroImg from "@/assets/hero-setup.jpg";

const HeroSection = () => {
  return (
    <section className="relative min-h-[600px] flex items-center overflow-hidden">
      <div className="absolute inset-0">
        <img src={heroImg} alt="Premium computer setup" className="w-full h-full object-cover" width={1920} height={800} />
        <div className="absolute inset-0 bg-gradient-to-r from-accent/90 via-accent/70 to-transparent" />
      </div>
      <div className="container mx-auto px-4 relative z-10 py-20">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7 }}
          className="max-w-2xl"
        >
          <h1 className="text-4xl md:text-6xl font-heading font-bold text-accent-foreground leading-tight mb-4">
            ALPHA COMPUTERS NANYUKI:
            <span className="block text-primary">YOUR TECH DESTINATION</span>
          </h1>
          <p className="text-lg text-accent-foreground/80 mb-8 max-w-lg">
            Shop the best, repair with the experts. Your trusted technology hub in Nanyuki, Kenya.
          </p>
          <div className="flex flex-wrap gap-4">
            <Button size="lg" className="text-base font-heading font-semibold px-8">
              SHOP NOW
            </Button>
            <Button size="lg" variant="outline" className="text-base font-heading font-semibold px-8 border-primary-foreground text-primary-foreground hover:bg-primary-foreground/10 bg-transparent">
              BOOK A REPAIR
            </Button>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default HeroSection;
