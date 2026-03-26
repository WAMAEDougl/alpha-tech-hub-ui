import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import heroImg from "@/assets/hero-setup.jpg";

const fadeUp = (delay: number) => ({
  initial: { opacity: 0, y: 40 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.65, ease: "easeOut", delay },
});

const HeroSection = () => {
  return (
    <section className="relative min-h-[500px] md:min-h-[600px] flex items-center overflow-hidden">
      <div className="absolute inset-0">
        <img src={heroImg} alt="Premium computer setup" className="w-full h-full object-cover" width={1920} height={800} />
        <div className="absolute inset-0 bg-gradient-to-r from-accent/90 via-accent/70 to-transparent" />
      </div>
      <div className="container mx-auto px-4 relative z-10 py-12 md:py-20">
        <div className="max-w-full md:max-w-2xl">

          {/* Line 1: ALPHA COMPUTERS NANYUKI: */}
          <motion.div {...fadeUp(0)}>
            <h1 className="text-3xl md:text-5xl lg:text-6xl font-heading font-bold text-accent-foreground leading-tight">
              ALPHA COMPUTERS NANYUKI:
            </h1>
          </motion.div>

          {/* Line 2: YOUR TECH DESTINATION */}
          <motion.div {...fadeUp(0.2)}>
            <h1 className="text-3xl md:text-5xl lg:text-6xl font-heading font-bold text-primary leading-tight mb-4">
              YOUR TECH DESTINATION
            </h1>
          </motion.div>

          {/* Subtext */}
          <motion.p
            {...fadeUp(0.4)}
            className="text-base md:text-lg text-accent-foreground/80 mb-6 md:mb-8 max-w-lg"
          >
            Shop the best, repair with the experts. Your trusted technology hub in Nanyuki, Kenya.
          </motion.p>

          {/* Buttons */}
          <motion.div {...fadeUp(0.6)} className="flex flex-wrap gap-3 md:gap-4">
            <Button size="lg" className="text-sm md:text-base font-heading font-semibold px-6 md:px-8 min-h-[44px]">
              SHOP NOW
            </Button>
            <Button size="lg" variant="outline" className="text-sm md:text-base font-heading font-semibold px-6 md:px-8 min-h-[44px] border-primary-foreground text-primary-foreground hover:bg-primary-foreground/10 bg-transparent">
              BOOK A REPAIR
            </Button>
          </motion.div>

        </div>
      </div>
    </section>
  );
};

export default HeroSection;
