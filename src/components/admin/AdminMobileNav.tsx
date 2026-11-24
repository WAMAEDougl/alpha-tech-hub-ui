import { useState } from "react";
import { Link, useLocation } from "@/lib/router";
import { Menu, LogOut, Store } from "lucide-react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { useSiteConfig } from "@/contexts/SiteConfigContext";
import { useAuth } from "@/contexts/AuthContext";
import { navFor } from "@/components/admin/adminNav";
import { useTheme } from "next-themes";
const logoRed = "/brand/logo-red.png";

const PLACEHOLDER_LOGOS = ["/logo-light.png", "/logo-dark.png"];

function isDefaultLogo(src: string) {
  return !src || PLACEHOLDER_LOGOS.includes(src);
}


const AdminMobileNav = () => {
  const [open, setOpen] = useState(false);
  const location = useLocation();
  const { config } = useSiteConfig();
  const { resolvedTheme } = useTheme();
  const { user, logout } = useAuth();
  const navItems = navFor(user?.role);

  const isDark = resolvedTheme === "dark";
  const configLogo = isDark ? config.logoDark : config.logoLight;
  const logoSrc = isDefaultLogo(configLogo) ? logoRed : configLogo;
  const companyName = config.companyName;

  return (
    <div className="h-14 flex items-center justify-between px-4 border-b border-sidebar-border bg-sidebar md:hidden">
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <Button variant="ghost" size="icon" aria-label="Open navigation menu">
            <Menu className="h-5 w-5" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-64 p-0 flex flex-col bg-sidebar text-sidebar-foreground">
          <div className="h-14 flex items-center px-4 border-b border-sidebar-border">
            <Link to="/admin" onClick={() => setOpen(false)} className="flex items-center gap-2">
              <img src={logoSrc} alt={companyName} className="h-8" />
              <span className="font-heading font-bold text-sm">{companyName}</span>
            </Link>
          </div>
          <nav className="flex-1 py-4 space-y-1 px-2">
            {navItems.map((item) => {
              const active = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setOpen(false)}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-md text-sm transition-colors ${
                    active
                      ? "bg-sidebar-primary text-sidebar-primary-foreground"
                      : "text-sidebar-foreground hover:bg-sidebar-accent"
                  }`}
                >
                  <item.icon className="h-4 w-4 shrink-0" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
          <div className="px-2 pb-4 space-y-1">
            <Link
              to="/"
              onClick={() => setOpen(false)}
              className="flex items-center gap-3 px-3 py-2.5 rounded-md text-sm text-sidebar-foreground hover:bg-sidebar-accent transition-colors"
            >
              <Store className="h-4 w-4 shrink-0" />
              <span>Back to Store</span>
            </Link>
            <button
              onClick={() => { setOpen(false); logout(); }}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-sm text-sidebar-foreground hover:bg-sidebar-accent transition-colors"
            >
              <LogOut className="h-4 w-4 shrink-0" />
              <span>Sign out</span>
            </button>
          </div>
        </SheetContent>
      </Sheet>

      <Link to="/admin" className="flex items-center gap-2">
        <img src={logoSrc} alt={companyName} className="h-8" />
        <span className="font-heading font-bold text-sidebar-foreground text-sm">{companyName}</span>
      </Link>
    </div>
  );
};

export default AdminMobileNav;
