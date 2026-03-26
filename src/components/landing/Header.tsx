import { useState } from "react";
import { Link } from "react-router-dom";
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

const Header = () => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [shopOpen, setShopOpen] = useState(false);
  const [servicesOpen, setServicesOpen] = useState(false);
  const { theme } = useTheme();
  const { config } = useSiteConfig();
  const { items } = useCart();
  const cartCount = items.reduce((sum, item) => sum + item.quantity, 0);

  const isDark = theme === "dark";
  const logoSrc = isDark
    ? (config.logoDark && config.logoDark !== PLACEHOLDER_LOGO_DARK ? config.logoDark : logoRed)
    : (config.logoLight && config.logoLight !== PLACEHOLDER_LOGO_LIGHT ? config.logoLight : logoBlack);

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-card/95 backdrop-blur-md border-b">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between gap-4">
        <Link to="/" className="flex items-center gap-2 shrink-0">
          <img src={logoSrc} alt={config.companyName} className="h-10 w-auto" />
          <span className="font-heading text-xl font-bold hidden sm:block">{config.companyName.toUpperCase()}</span>
        </Link>

        <nav className="hidden lg:flex items-center gap-1">
          <Link to="/" className="px-3 py-2 text-sm font-medium hover:text-primary transition-colors">Home</Link>
          <div className="relative" onMouseEnter={() => setShopOpen(true)} onMouseLeave={() => setShopOpen(false)}>
            <button className="px-3 py-2 text-sm font-medium hover:text-primary transition-colors flex items-center gap-1">
              Shop <ChevronDown className="h-3 w-3" />
            </button>
            {shopOpen && (
              <div className="absolute top-full left-0 bg-card border rounded-md shadow-lg py-2 min-w-[180px]">
                <Link to="/#catalog" className="block px-4 py-2 text-sm hover:bg-muted transition-colors">Laptops</Link>
                <Link to="/#catalog" className="block px-4 py-2 text-sm hover:bg-muted transition-colors">Desktops</Link>
                <Link to="/#catalog" className="block px-4 py-2 text-sm hover:bg-muted transition-colors">Accessories</Link>
                <Link to="/#catalog" className="block px-4 py-2 text-sm hover:bg-muted transition-colors">Networking</Link>
              </div>
            )}
          </div>
          <div className="relative" onMouseEnter={() => setServicesOpen(true)} onMouseLeave={() => setServicesOpen(false)}>
            <button className="px-3 py-2 text-sm font-medium hover:text-primary transition-colors flex items-center gap-1">
              Services <ChevronDown className="h-3 w-3" />
            </button>
            {servicesOpen && (
              <div className="absolute top-full left-0 bg-card border rounded-md shadow-lg py-2 min-w-[180px]">
                <Link to="/#services" className="block px-4 py-2 text-sm hover:bg-muted transition-colors">Hardware Repair</Link>
                <Link to="/#services" className="block px-4 py-2 text-sm hover:bg-muted transition-colors">OS Installation</Link>
                <Link to="/#services" className="block px-4 py-2 text-sm hover:bg-muted transition-colors">Data Recovery</Link>
                <Link to="/#services" className="block px-4 py-2 text-sm hover:bg-muted transition-colors">Network Setup</Link>
              </div>
            )}
          </div>
          <Link to="/#about" className="px-3 py-2 text-sm font-medium hover:text-primary transition-colors">About Us</Link>
          <Link to="/#contact" className="px-3 py-2 text-sm font-medium hover:text-primary transition-colors">Contact</Link>
        </nav>

        <div className="hidden md:flex items-center gap-2 flex-1 max-w-sm">
          <div className="relative w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search products..." className="pl-9 h-9" />
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button size="sm" className="hidden sm:flex">Quick Quote</Button>
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

      {mobileOpen && (
        <div className="lg:hidden border-t bg-card">
          <div className="container mx-auto px-4 py-4 flex flex-col gap-2">
            <div className="relative mb-2">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search products..." className="pl-9" />
            </div>
            <Link to="/" className="py-2 text-sm font-medium" onClick={() => setMobileOpen(false)}>Home</Link>
            <Link to="/#catalog" className="py-2 text-sm font-medium" onClick={() => setMobileOpen(false)}>Shop</Link>
            <Link to="/#services" className="py-2 text-sm font-medium" onClick={() => setMobileOpen(false)}>Services</Link>
            <Link to="/#about" className="py-2 text-sm font-medium" onClick={() => setMobileOpen(false)}>About Us</Link>
            <Link to="/#contact" className="py-2 text-sm font-medium" onClick={() => setMobileOpen(false)}>Contact</Link>
            <Button size="sm" className="mt-2 w-full">Quick Quote</Button>
          </div>
        </div>
      )}
    </header>
  );
};

export default Header;
