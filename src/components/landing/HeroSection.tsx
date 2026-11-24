import { motion, useReducedMotion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";

// One calm photograph instead of a slideshow. Swap this for a photo of your own shop when you have one.
const HERO_IMAGE = "https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=1200&h=1400&fit=crop";

const go = (id: string) => document.querySelector(id)?.scrollIntoView({ behavior: "smooth" });

const HeroSection = () => {
  const reduce = useReducedMotion();
  const { data: settings } = useQuery({ queryKey: ["settings"], queryFn: () => api<{ address: string | null }>("/settings", { auth: false }), staleTime: 300_000 });

  // the single orchestrated moment on the page: the headline settles, then the photograph
  const rise = (delay: number) => reduce ? {} : ({
    initial: { opacity: 0, y: 14 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.9, ease: [0.22, 1, 0.36, 1], delay },
  } as const);

  return (
    <section className="container mx-auto px-6 lg:px-10">
      <div className="grid items-center gap-12 py-14 md:py-20 lg:grid-cols-12 lg:gap-16 lg:py-28">
        <div className="lg:col-span-7">
          <motion.h1 {...rise(0)} className="max-w-[16ch] text-[2.75rem] leading-[1.02] sm:text-6xl lg:text-[5.25rem]">
            Good computers, looked after properly.
          </motion.h1>

          <motion.p {...rise(0.15)} className="mt-7 max-w-md text-[1.05rem] leading-relaxed text-muted-foreground">
            Laptops, desktops and parts from brands you know, with repairs and custom builds done by our own technicians in Nanyuki.
          </motion.p>

          <motion.div {...rise(0.3)} className="mt-9 flex flex-wrap items-center gap-x-8 gap-y-4">
            <button
              onClick={() => go("#catalog")}
              className="inline-flex h-12 items-center rounded-md bg-primary px-7 text-[0.95rem] font-medium text-primary-foreground transition-colors hover:bg-primary/90"
            >
              Shop laptops and desktops
            </button>
            <button
              onClick={() => go("#services")}
              className="text-[0.95rem] font-medium underline underline-offset-[6px] decoration-1 decoration-foreground/40 transition-colors hover:decoration-primary"
            >
              Book a repair
            </button>
          </motion.div>

          {settings?.address && (
            <motion.p {...rise(0.45)} className="mt-14 max-w-sm border-t pt-5 text-sm leading-relaxed text-muted-foreground">
              Come and see us: {settings.address}
            </motion.p>
          )}
        </div>

        <motion.div {...rise(0.2)} className="relative lg:col-span-5">
          {/* an offset hairline frame: quiet, and it makes the photo feel mounted */}
          <div aria-hidden className="absolute inset-0 translate-x-3 translate-y-3 rounded-md border border-foreground/15 sm:translate-x-4 sm:translate-y-4" />
          <img
            src={HERO_IMAGE} alt="A laptop on a wooden desk" width={1200} height={1400} fetchPriority="high"
            className="relative aspect-[5/4] w-full rounded-md bg-muted object-cover sm:aspect-[4/3] lg:aspect-[4/5]"
          />
        </motion.div>
      </div>
    </section>
  );
};

export default HeroSection;
