import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";

const slides = [
  {
    url: "https://images.unsplash.com/photo-1593642702821-c8da6771f0c6?w=1920&h=800&fit=crop",
    alt: "Gaming laptop setup",
  },
  {
    url: "https://images.unsplash.com/photo-1587831990711-23ca6441447b?w=1920&h=800&fit=crop",
    alt: "Desktop computer workstation",
  },
  {
    url: "https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=1920&h=800&fit=crop",
    alt: "Laptop on desk",
  },
  {
    url: "https://images.unsplash.com/photo-1518770660439-4636190af475?w=1920&h=800&fit=crop",
    alt: "Computer hardware components",
  },
  {
    url: "https://images.unsplash.com/photo-1531297484001-80022131f5a1?w=1920&h=800&fit=crop",
    alt: "Modern tech workspace",
  },
];

const fadeUp = (delay: number) => ({
  initial: { opacity: 0, y: 40 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.65, ease: "easeOut", delay },
});

const HeroSection = () => {
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrent((prev) => (prev + 1) % slides.length);
    }, 4000);
    return () => clearInterval(timer);
  }, []);

  return (
    <section className="relative min-h-[500px] md:min-h-[600px] flex items-center overflow-hidden">
      {/* Slideshow background */}
      <div className="absolute inset-0">
        <AnimatePresence mode="sync">
          <motion.img
            key={slides[current].url}
            src={slides[current].url}
            alt={slides[current].alt}
            className="absolute inset-0 w-full h-full object-cover"
            width={1920}
            height={800}
            initial={{ opacity: 0, scale: 1.04 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.2, ease: "easeInOut" }}
          />
        </AnimatePresence>
        <div className="absolute inset-0 bg-gradient-to-r from-accent/90 via-accent/70 to-transparent" />
      </div>

      {/* Slide dots */}
      <div className="absolute bottom-5 left-1/2 -translate-x-1/2 flex gap-2 z-20">
        {slides.map((_, i) => (
          <button
            key={i}
            onClick={() => setCurrent(i)}
            aria-label={`Go to slide ${i + 1}`}
            className={`h-2 rounded-full transition-all duration-300 ${
              i === current ? "w-6 bg-primary" : "w-2 bg-white/50"
            }`}
          />
        ))}
      </div>

      {/* Content */}
      <div className="container mx-auto px-4 relative z-10 py-12 md:py-20">
        <div className="max-w-full md:max-w-2xl">

          <motion.div {...fadeUp(0)}>
            <h1 className="text-3xl md:text-5xl lg:text-6xl font-heading font-bold text-accent-foreground leading-tight">
              ALPHA COMPUTERS NANYUKI:
            </h1>
          </motion.div>

          <motion.div {...fadeUp(0.2)}>
            <h1 className="text-3xl md:text-5xl lg:text-6xl font-heading font-bold text-primary leading-tight mb-4">
              YOUR TECH DESTINATION
            </h1>
          </motion.div>

          <motion.p
            {...fadeUp(0.4)}
            className="text-base md:text-lg text-accent-foreground/80 mb-6 md:mb-8 max-w-lg"
          >
            Shop the best, repair with the experts. Your trusted technology hub in Nanyuki, Kenya.
          </motion.p>

          <motion.div {...fadeUp(0.6)} className="flex flex-wrap gap-3 md:gap-4">
            <Button
              size="lg"
              className="text-sm md:text-base font-heading font-semibold px-6 md:px-8 min-h-[44px]"
              onClick={() => document.querySelector("#catalog")?.scrollIntoView({ behavior: "smooth" })}
            >
              SHOP NOW
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="text-sm md:text-base font-heading font-semibold px-6 md:px-8 min-h-[44px] border-primary-foreground text-primary-foreground hover:bg-primary-foreground/10 bg-transparent"
              onClick={() => document.querySelector("#services")?.scrollIntoView({ behavior: "smooth" })}
            >
              BOOK A REPAIR
            </Button>
          </motion.div>

        </div>
      </div>
    </section>
  );
};

export default HeroSection;
