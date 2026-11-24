import { useState } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { Eye, EyeOff, Loader2, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import { useSiteConfig } from "@/contexts/SiteConfigContext";
import logoRed from "@/assets/logo-red.png";

const AdminLogin = () => {
  const { user, loading, login } = useAuth();
  const { config } = useSiteConfig();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: string } | null)?.from;

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  if (!loading && user) return <Navigate to={from && from.startsWith("/admin") ? from : "/admin"} replace />;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setError("");
    setBusy(true);
    try {
      await login(email, password, { staffOnly: true });
      navigate(from && from.startsWith("/admin") ? from : "/admin", { replace: true });
    } catch (err) {
      setError((err as Error)?.message || "Could not sign in.");
      setPassword("");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <Card className="w-full max-w-sm">
        <CardContent className="p-6 space-y-6">
          <div className="flex flex-col items-center gap-2 text-center">
            <img src={logoRed} alt={config.companyName} className="h-10" />
            <h1 className="text-xl font-heading font-bold">Staff sign in</h1>
            <p className="text-sm text-muted-foreground">{config.companyName} back office</p>
          </div>

          <form onSubmit={onSubmit} className="space-y-4" noValidate>
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" autoComplete="username" required autoFocus
                value={email} onChange={e => setEmail(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input id="password" type={show ? "text" : "password"} autoComplete="current-password" required
                  className="pr-10" value={password} onChange={e => setPassword(e.target.value)} />
                <button type="button" onClick={() => setShow(s => !s)} aria-label={show ? "Hide password" : "Show password"}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground">
                  {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {error && (
              <p role="alert" className="text-sm text-destructive bg-destructive/10 rounded-md px-3 py-2">{error}</p>
            )}

            <Button type="submit" className="w-full" disabled={busy || !email || !password}>
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Lock className="h-4 w-4" />}
              Sign in
            </Button>
          </form>

          <p className="text-center text-xs text-muted-foreground">
            Forgot your password? Ask an admin to reset it. <br />
            <Link to="/" className="underline hover:text-foreground">Back to store</Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminLogin;
