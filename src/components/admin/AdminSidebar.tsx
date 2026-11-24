import { useState } from "react";
import { Link, useLocation } from "@/lib/router";
import { ChevronLeft, LogOut, Store } from "lucide-react";
import { useSiteConfig } from "@/contexts/SiteConfigContext";
import { useAuth } from "@/contexts/AuthContext";
import { navFor, roleLabel } from "@/components/admin/adminNav";
import { useTheme } from "next-themes";
const logoRed = "/brand/logo-red.png";

const PLACEHOLDER_LOGOS = ["/logo-light.png", "/logo-dark.png"];

function isDefaultLogo(src: string) {
  return !src || PLACEHOLDER_LOGOS.includes(src);
}

const AdminSidebar = () => {
  const [collapsed, setCollapsed] = useState(false);
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
    <aside className={`${collapsed ? 'w-16' : 'w-60'} bg-sidebar border-r border-sidebar-border hidden md:flex flex-col transition-all duration-200 shrink-0`}>
      <div className="h-16 flex items-center justify-between px-3 border-b border-sidebar-border">
        {!collapsed && (
          <Link to="/admin" className="flex items-center gap-2">
            <img src={logoSrc} alt={companyName} className="h-8" />
            <span className="font-heading font-bold text-sidebar-foreground text-sm">{companyName}</span>
          </Link>
        )}
        <button onClick={() => setCollapsed(!collapsed)} className="p-1.5 rounded-md hover:bg-sidebar-accent text-sidebar-foreground">
          <ChevronLeft className={`h-4 w-4 transition-transform ${collapsed ? 'rotate-180' : ''}`} />
        </button>
      </div>
      <nav className="flex-1 py-4 space-y-1 px-2">
        {navItems.map(item => {
          const active = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-md text-sm transition-colors ${
                active
                  ? 'bg-sidebar-primary text-sidebar-primary-foreground'
                  : 'text-sidebar-foreground hover:bg-sidebar-accent'
              }`}
            >
              <item.icon className="h-4 w-4 shrink-0" />
              {!collapsed && <span>{item.label}</span>}
            </Link>
          );
        })}
      </nav>
      <div className="px-2 pb-4 space-y-1">
        {user && !collapsed && (
          <div className="px-3 py-2 text-xs text-sidebar-foreground/70 truncate">
            <p className="font-medium text-sidebar-foreground truncate">{user.name}</p>
            <p>{roleLabel[user.role]}</p>
          </div>
        )}
        <Link
          to="/"
          className="flex items-center gap-3 px-3 py-2.5 rounded-md text-sm text-sidebar-foreground hover:bg-sidebar-accent transition-colors"
        >
          <Store className="h-4 w-4 shrink-0" />
          {!collapsed && <span>Back to Store</span>}
        </Link>
        <button
          onClick={logout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-sm text-sidebar-foreground hover:bg-sidebar-accent transition-colors"
        >
          <LogOut className="h-4 w-4 shrink-0" />
          {!collapsed && <span>Sign out</span>}
        </button>
      </div>
    </aside>
  );
};

export default AdminSidebar;
