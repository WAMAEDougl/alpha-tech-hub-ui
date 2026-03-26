import { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { ShoppingCart, User, Search, Menu, X, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useTheme } from "next-themes";
import { useSiteConfig } from "@/contexts/SiteConfigContext";
import { useCart } from "@/contexts/CartContext";
import { motion, AnimatePresence } from "framer-motion";
import logoBlack from "@/assets/logo-black.png";
import logoRed from "@/assets/logo-red.png";

const PLACEHOLDER_LOGO_LIGHT = "/logo-light.png";
const PLACEHOLDER_LOGO_DARK = "/logo-dark.png";

function useHashNav() {
  const navigate = useNavigate();
  const location = useLocation();
  return (hash: string) => {
    if (location.pathname === "/") {
      const el = document.querySelector(hash);
      if (el) el.scrollIntoView({ behavior: "smooth" });
      else window.scrollTo({ top: 0, behavior: "smooth" });
    } else {
      navigate("/" + hash);
      setTimeout(() => {
        const el = document.querySelector(hash);
        if (el) el.scrollIntoView({ behavior: "smooth" });
      }, 300);
    }
  };
}

const navLinks = [
  { label: "Home", hash: null },
  { label: "About Us", hash: "#about" },
  { label: "Contact", hash: "#contact" },
];

const shopItems = [
  { label: "Laptops", hash: "#catalog" },
  { label: "Desktops", hash: "#catalog" },
  { label: "Accessories", hash: "#catalog" },
  { label: "Monitors", hash: "#catalog" },
  { label: "PC Components", hash: "#pc-parts" },
  { label: "Laptop Parts", hash: "#laptop-parts" },
];

const serviceItems = [
  { label: "Hardware Repair", hash: "#services" },
  { label: "OS Installation", hash: "#services" },
  { label: "Data Recovery", hash: "#services" },
  { label: "Network Setup", hash: "#services" },
  { label: "E-Waste Disposal", hash: "#disposal" },
];

const Header = () => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [shopOpen, setShopOpen] = useState(false);
  const [servicesOpen, setServicesOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const { theme } = useTheme();
  const { config } = useSiteConfig();
  const { items } = useCart();
  const cartCount = items.reduce((sum, item) => sum + item.quantity, 0);
  const scrollTo = useHashNav();

  // Detect scroll for glow effect
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const isDark = theme === "dark";
  const logoSrc = isDark
    ? (config.logoDark && config.logoDark !== PLACEHOLDER_LOGO_DARK ? config.logoDark : logoRed)
    : (config.logoLight && config.logoLight !== PLACEHOLDER_LOGO_LIGHT ? config.logoLight : logoBlack);

  return (
    <motion.header
      initial={{ y: -80, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className={`fixed top-0 left-0 right-0 z-50 border-b transition-all duration-300 ${
        scrolled
          ? "bg-card/90 backdrop-blur-xl shadow-[0_4px_32px_rgba(229,62,62,0.15)]"
          : "bg-card/95 backdrop-blur-md"
      }`}
    >
      <div className="container mx-auto px-4 h-16 flex items-center justify-between gap-4">

        {/* Logo — slides in from left */}
        <motion.div
          initial={{ x: -30, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ delay: 0.15, duration: 0.5 }}
        >
          <Link
            to="/"
            onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
            className="flex items-center gap-2 shrink-0 group"
          >
            <motion.img
              src={logoSrc}
              alt={config.companyName}
              className="h-10 w-auto"
              whileHover={{ scale: 1.08, rotate: -3 }}
              transition={{ type: "spring", stiffness: 300 }}
            />
            <span className="font-heading text-xl font-bold hidden sm:block group-hover:text-primary transition-colors duration-200">
              {config.companyName.toUpperCase()}
            </span>
          </Link>
        </motion.div>

        {/* Desktop nav — stagger in */}
        <nav className="hidden lg:flex items-center gap-1">
          {/* Home */}
          <motion.div initial={{ y: -20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.2 }}>
            <Link
              to="/"
              onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
              className="relative px-3 py-2 text-sm font-medium group"
            >
              <span className="relative z-10 group-hover:text-primary transition-colors duration-200">Home</span>
              <span className="absolute inset-0 rounded-md bg-primary/0 group-hover:bg-primary/10 transition-all duration-200" />
              <span className="absolute bottom-0 left-1/2 -translate-x-1/2 h-0.5 w-0 bg-primary group-hover:w-4/5 transition-all duration-300 rounded-full" />
            </Link>
          </motion.div>

          {/* Shop dropdown */}
          <motion.div initial={{ y: -20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.25 }}
            className="relative" onMouseEnter={() => setShopOpen(true)} onMouseLeave={() => setShopOpen(false)}
          >
            <button className="relative px-3 py-2 text-sm font-medium flex items-center gap-1 group">
              <span className="relative z-10 group-hover:text-primary transition-colors duration-200">Shop</span>
              <motion.span animate={{ rotate: shopOpen ? 180 : 0 }} transition={{ duration: 0.2 }}>
                <ChevronDown className="h-3 w-3" />
              </motion.span>
              <span className="absolute inset-0 rounded-md bg-primary/0 group-hover:bg-primary/10 transition-all duration-200" />
              <span className="absolute bottom-0 left-1/2 -translate-x-1/2 h-0.5 w-0 bg-primary group-hover:w-4/5 transition-all duration-300 rounded-full" />
            </button>
            <AnimatePresence>
              {shopOpen && (
                <motion.div
                  initial={{ opacity: 0, y: -8, scale: 0.96 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -8, scale: 0.96 }}
                  transition={{ duration: 0.15 }}
                  className="absolute top-full left-0 bg-card border rounded-xl shadow-xl py-2 min-w-[180px] z-50 overflow-hidden"
                >
                  {shopItems.map((item, i) => (
                    <motion.button
                      key={item.label}
                      initial={{ x: -10, opacity: 0 }}
                      animate={{ x: 0, opacity: 1 }}
                      transition={{ delay: i * 0.05 }}
                      onClick={() => { scrollTo(item.hash); setShopOpen(false); }}
                      className="block w-full text-left px-4 py-2.5 text-sm hover:bg-primary/10 hover:text-primary transition-colors duration-150"
                    >
                      {item.label}
                    </motion.button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>

          {/* Services dropdown */}
          <motion.div initial={{ y: -20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.3 }}
            className="relative" onMouseEnter={() => setServicesOpen(true)} onMouseLeave={() => setServicesOpen(false)}
          >
            <button className="relative px-3 py-2 text-sm font-medium flex items-center gap-1 group">
              <span className="relative z-10 group-hover:text-primary transition-colors duration-200">Services</span>
              <motion.span animate={{ rotate: servicesOpen ? 180 : 0 }} transition={{ duration: 0.2 }}>
                <ChevronDown className="h-3 w-3" />
              </motion.span>
              <span className="absolute inset-0 rounded-md bg-primary/0 group-hover:bg-primary/10 transition-all duration-200" />
              <span className="absolute bottom-0 left-1/2 -translate-x-1/2 h-0.5 w-0 bg-primary group-hover:w-4/5 transition-all duration-300 rounded-full" />
            </button>
            <AnimatePresence>
              {servicesOpen && (
                <motion.div
                  initial={{ opacity: 0, y: -8, scale: 0.96 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -8, scale: 0.96 }}
                  transition={{ duration: 0.15 }}
                  className="absolute top-full left-0 bg-card border rounded-xl shadow-xl py-2 min-w-[180px] z-50 overflow-hidden"
                >
                  {serviceItems.map((item, i) => (
                    <motion.button
                      key={item.label}
                      initial={{ x: -10, opacity: 0 }}
                      animate={{ x: 0, opacity: 1 }}
                      transition={{ delay: i * 0.05 }}
                      onClick={() => { scrollTo(item.hash); setServicesOpen(false); }}
                      className="block w-full text-left px-4 py-2.5 text-sm hover:bg-primary/10 hover:text-primary transition-colors duration-150"
                    >
                      {item.label}
                    </motion.button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>

          {/* Custom Builds */}
          <motion.div initial={{ y: -20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.35 }}>
            <button onClick={() => scrollTo("#custom-builds")} className="relative px-3 py-2 text-sm font-medium group">
              <span className="relative z-10 group-hover:text-primary transition-colors duration-200">Custom Builds</span>
              <span className="absolute inset-0 rounded-md bg-primary/0 group-hover:bg-primary/10 transition-all duration-200" />
              <span className="absolute bottom-0 left-1/2 -translate-x-1/2 h-0.5 w-0 bg-primary group-hover:w-4/5 transition-all duration-300 rounded-full" />
            </button>
          </motion.div>

          {/* About Us */}
          <motion.div initial={{ y: -20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.4 }}>
            <button onClick={() => scrollTo("#about")} className="relative px-3 py-2 text-sm font-medium group">
              <span className="relative z-10 group-hover:text-primary transition-colors duration-200">About Us</span>
              <span className="absolute inset-0 rounded-md bg-primary/0 group-hover:bg-primary/10 transition-all duration-200" />
              <span className="absolute bottom-0 left-1/2 -translate-x-1/2 h-0.5 w-0 bg-primary group-hover:w-4/5 transition-all duration-300 rounded-full" />
            </button>
          </motion.div>

          {/* Contact */}
          <motion.div initial={{ y: -20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.45 }}>
            <button onClick={() => scrollTo("#contact")} className="relative px-3 py-2 text-sm font-medium group">
              <span className="relative z-10 group-hover:text-primary transition-colors duration-200">Contact</span>
              <span className="absolute inset-0 rounded-md bg-primary/0 group-hover:bg-primary/10 transition-all duration-200" />
              <span className="absolute bottom-0 left-1/2 -translate-x-1/2 h-0.5 w-0 bg-primary group-hover:w-4/5 transition-all duration-300 rounded-full" />
            </button>
          </motion.div>
        </nav>

        {/* Search bar */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.45 }}
          className="hidden md:flex items-center gap-2 flex-1 max-w-sm"
        >
          <div className="relative w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search products..."
              className="pl-9 h-9 focus:ring-2 focus:ring-primary/30 transition-shadow"
            />
          </div>
        </motion.div>

        {/* Right actions */}
        <motion.div
          initial={{ x: 30, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.5 }}
          className="flex items-center gap-2"
        >
          <Button
            size="sm"
            className="hidden sm:flex hover:shadow-[0_0_12px_rgba(229,62,62,0.5)] transition-shadow duration-300"
            onClick={() => scrollTo("#contact")}
          >
            Quick Quote
          </Button>

          {/* Cart */}
          <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.95 }}>
            <Link to="/cart" className="relative p-2 hover:bg-primary/10 rounded-md transition-colors">
              <ShoppingCart className="h-5 w-5" />
              <AnimatePresence>
                {cartCount > 0 && (
                  <motion.span
                    key={cartCount}
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    exit={{ scale: 0 }}
                    className="absolute -top-1 -right-1 bg-primary text-primary-foreground text-[10px] font-bold rounded-full h-4 w-4 flex items-center justify-center"
                  >
                    {cartCount}
                  </motion.span>
                )}
              </AnimatePresence>
            </Link>
          </motion.div>

          {/* Admin */}
          <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.95 }}>
            <Link to="/admin" className="p-2 hover:bg-primary/10 rounded-md transition-colors">
              <User className="h-5 w-5" />
            </Link>
          </motion.div>

          <ThemeToggle />

          {/* Hamburger */}
          <motion.button
            whileTap={{ scale: 0.9 }}
            className="lg:hidden p-2 hover:bg-primary/10 rounded-md transition-colors"
            onClick={() => setMobileOpen(!mobileOpen)}
          >
            <AnimatePresence mode="wait">
              {mobileOpen
                ? <motion.span key="x" initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }} transition={{ duration: 0.15 }}><X className="h-5 w-5" /></motion.span>
                : <motion.span key="menu" initial={{ rotate: 90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: -90, opacity: 0 }} transition={{ duration: 0.15 }}><Menu className="h-5 w-5" /></motion.span>
              }
            </AnimatePresence>
          </motion.button>
        </motion.div>
      </div>

      {/* Mobile menu */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2, ease: "easeInOut" }}
            className="lg:hidden border-t bg-card"
          >
            <div className="container mx-auto px-4 py-4 flex flex-col gap-1">
              <div className="relative mb-3">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Search products..." className="pl-9" />
              </div>
              {[
                { label: "Home", action: () => { setMobileOpen(false); window.scrollTo({ top: 0, behavior: "smooth" }); } },
                { label: "Shop", action: () => { setMobileOpen(false); scrollTo("#catalog"); } },
                { label: "Services", action: () => { setMobileOpen(false); scrollTo("#services"); } },
                { label: "Custom Builds", action: () => { setMobileOpen(false); scrollTo("#custom-builds"); } },
                { label: "About Us", action: () => { setMobileOpen(false); scrollTo("#about"); } },
                { label: "Contact", action: () => { setMobileOpen(false); scrollTo("#contact"); } },
              ].map((item, i) => (
                <motion.button
                  key={item.label}
                  initial={{ x: -20, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: i * 0.06 }}
                  onClick={item.action}
                  className="py-3 px-3 text-sm font-medium text-left rounded-md hover:bg-primary/10 hover:text-primary transition-colors min-h-[44px]"
                >
                  {item.label}
                </motion.button>
              ))}
              <motion.div initial={{ x: -20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: 0.3 }}>
                <Button size="sm" className="mt-2 w-full min-h-[44px]" onClick={() => { setMobileOpen(false); scrollTo("#contact"); }}>
                  Quick Quote
                </Button>
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.header>
  );
};

export default Header;
