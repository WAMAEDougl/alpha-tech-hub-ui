import { Navigate, useLocation } from "@/lib/router";
import { Loader2, ShieldAlert } from "lucide-react";
import { Link } from "@/lib/router";
import { Button } from "@/components/ui/button";
import { canAccess, useAuth } from "@/contexts/AuthContext";

/** Gate for the whole admin area. No session → login. Wrong role → "no access". */
/** `checkPath` also enforces which sections the user's role may open (used inside the layout). */
const RequireStaff = ({ children, checkPath = false }: { children: React.ReactNode; checkPath?: boolean }) => {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }
  if (!user) return <Navigate to={`/admin/login?from=${encodeURIComponent(location.pathname)}`} replace />;

  if (checkPath ? !canAccess(user.role, location.pathname) : user.role === "CUSTOMER") {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-24 text-center">
        <ShieldAlert className="h-10 w-10 text-muted-foreground" />
        <h1 className="text-xl font-heading font-bold">You don't have access to this page</h1>
        <p className="text-sm text-muted-foreground max-w-sm">
          Your account ({user.role.toLowerCase()}) can't open this section. Ask an admin if you need it.
        </p>
        <Button asChild><Link to="/admin">Back to dashboard</Link></Button>
      </div>
    );
  }
  return <>{children}</>;
};

export default RequireStaff;
