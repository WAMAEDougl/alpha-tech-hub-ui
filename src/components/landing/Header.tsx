import { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { ShoppingCart, User, Search, Menu, X, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useTheme } from "next-themes";
import { useSiteConfig } from "@/contexts/SiteConfigContext";
import { useCart } from "@/contexts/CartContext";
import logoBlack from "@/assets/logo-black.png";
import logoRed from "@/assets/logo-red.png";

const PLACEHOLDER_LOGO_LIGHT = "/logo-light.png";
const PLACEHOLDER_LOGO_DARK = "/logo-dark.png";

// Scrolls to a hash section — navigates to home first if not already there
function useHashNav() {
  const navigate = useNavigate();
  const location = useLocation();

  return (hash: string) => {
    if (location.pathname === "/") {
      const el = document.querySelector(hash);
      if (el) el.scrollIntoView({ behavior: "smooth" });
    } else {
      navigate("/" + hash);
    }
  };
}

const Header = () => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [shopOpen, setShopOpen] = useState(false);
  const [servicesOpen, setServicesOpen] = useState(false);
  const { theme } = useTheme();
  const { config } = useSiteConfig();
  const { items } = useCart();
  const cartCount = items.reduce((sum, item) => sum + item.quantity, 0);
  const scrollTo = useHashNav();

  const isDark = theme === "dark";
  const logoSrc = isDark
    ? (config.logoDark && config.logoDark !== PLACEHOLDER_LOGO_DARK ? config.logoDark : logoRed)
    : (config.logoLight && config.logoLight !== PLACEHOLDER_LOGO_LIGHT ? config.logoLight : logoBlack);

  const shopItems = [
    { label: "Laptops", hash: "#catalog" },
    { label: "Desktops", hash: "#catalog" },
    { label: "Accessories", hash: "#catalog" },
    { label: "Networking", hash: "#catalog" },
  ];

  const serviceItems = [
    { label: "Hardware Repair", hash: "#services" },
    { label: "OS Installation", hash: "#services" },
    { label: "Data Recovery", hash: "#services" },
    { label: "Network Setup", hash: "#services" },
  ];

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-card/95 backdrop-blur-md border-b">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between gap-4">
        <Link to="/" className="flex items-center gap-2 shrink-0">
          <img src={logoSrc} alt={config.companyName} className="h-10 w-auto" />
          <span className="font-heading text-xl font-bold hidden sm:block">{config.companyName.toUpperCase()}</span>
        </Link>

        <nav className="hidden lg:flex items-center gap-1">
          <Link to="/" className="px-3 py-2 text-sm font-medium hover:text-primary transition-colors">Home</Link>

          {/* Shop dropdown */}
          <div className="relative" onMouseEnter={() => setShopOpen(true)} onMouseLeave={() => setShopOpen(false)}>
            <button className="px-3 py-2 text-sm font-medium hover:text-primary transition-colors flex items-center gap-1">
              Shop <ChevronDown className="h-3 w-3" />
            </button>
            {shopOpen && (
              <div className="absolute top-full left-0 bg-card border rounded-md shadow-lg py-2 min-w-[180px] z-50">
                {shopItems.map((item) => (
                  <button
                    key={item.label}
                    onClick={() => { scrollTo(item.hash); setShopOpen(false); }}
                    className="block w-full text-left px-4 py-2 text-sm hover:bg-muted transition-colors"
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Services dropdown */}
          <div className="relative" onMouseEnter={() => setServicesOpen(true)} onMouseLeave={() => setServicesOpen(false)}>
            <button className="px-3 py-2 text-sm font-medium hover:text-primary transition-colors flex items-center gap-1">
              Services <ChevronDown className="h-3 w-3" />
            </button>
            {servicesOpen && (
              <div className="absolute top-full left-0 bg-card border rounded-md shadow-lg py-2 min-w-[180px] z-50">
                {serviceItems.map((item) => (
                  <button
                    key={item.label}
                    onClick={() => { scrollTo(item.hash); setServicesOpen(false); }}
                    className="block w-full text-left px-4 py-2 text-sm hover:bg-muted transition-colors"
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          <button onClick={() => scrollTo("#about")} className="px-3 py-2 text-sm font-medium hover:text-primary transition-colors">About Us</button>
          <button onClick={() => scrollTo("#contact")} className="px-3 py-2 text-sm font-medium hover:text-primary transition-colors">Contact</button>
        </nav>

        <div className="hidden md:flex items-center gap-2 flex-1 max-w-sm">
          <div className="relative w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search products..." className="pl-9 h-9" />
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button size="sm" className="hidden sm:flex" onClick={() => scrollTo("#contact")}>Quick Quote</Button>
          <Link to="/cart" className="relative p-2 hover:bg-muted rounded-md transition-colors">
            <ShoppingCart className="h-5 w-5" />
            {cartCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-primary text-primary-foreground text-[10px] font-bold rounded-full h-4 w-4 flex items-center justify-center">{cartCount}</span>
            )}
          </Link>
          <Link to="/admin" className="p-2 hover:bg-muted rounded-md transition-colors">
            <User className="h-5 w-5" />
          </Link>
          <ThemeToggle />
          <button className="lg:hidden p-2 hover:bg-muted rounded-md" onClick={() => setMobileOpen(!mobileOpen)}>
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="lg:hidden border-t bg-card">
          <div className="container mx-auto px-4 py-4 flex flex-col gap-2">
            <div className="relative mb-2">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search products..." className="pl-9" />
            </div>
            <Link to="/" className="py-2 text-sm font-medium" onClick={() => setMobileOpen(false)}>Home</Link>
            <button className="py-2 text-sm font-medium text-left" onClick={() => { scrollTo("#catalog"); setMobileOpen(false); }}>Shop</button>
            <button className="py-2 text-sm font-medium text-left" onClick={() => { scrollTo("#services"); setMobileOpen(false); }}>Services</button>
            <button className="py-2 text-sm font-medium text-left" onClick={() => { scrollTo("#about"); setMobileOpen(false); }}>About Us</button>
            <button className="py-2 text-sm font-medium text-left" onClick={() => { scrollTo("#contact"); setMobileOpen(false); }}>Contact</button>
            <Button size="sm" className="mt-2 w-full" onClick={() => { scrollTo("#contact"); setMobileOpen(false); }}>Quick Quote</Button>
          </div>
        </div>
      )}
    </header>
  );
};

export default Header;
