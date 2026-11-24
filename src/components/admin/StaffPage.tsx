import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { KeyRound, Loader2, UserPlus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/lib/api";
import { useAuth, type Role } from "@/contexts/AuthContext";
import { roleLabel } from "./adminNav";

interface UserRow { id: string; email: string; name: string; role: Role; isActive: boolean; createdAt: string }

function CreateDialog({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [f, setF] = useState({ name: "", email: "", password: "", role: "INVENTORY" as Role });
  const [error, setError] = useState("");
  const m = useMutation({
    mutationFn: () => api("/users/staff", { body: { ...f, name: f.name.trim(), email: f.email.trim() } }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["users"] }); toast({ title: "Staff account created" }); onClose(); },
    onError: (e: Error) => setError(e.message),
  });
  const valid = f.name.trim().length >= 2 && /\S+@\S+\.\S+/.test(f.email) && f.password.length >= 8;
  return (
    <Dialog open onOpenChange={o => { if (!o) onClose(); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add staff member</DialogTitle>
          <DialogDescription>Give them the temporary password in person. An admin can reset it any time.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5"><Label>Full name</Label><Input value={f.name} onChange={e => setF({ ...f, name: e.target.value })} autoFocus /></div>
          <div className="space-y-1.5"><Label>Email</Label><Input type="email" value={f.email} onChange={e => setF({ ...f, email: e.target.value })} /></div>
          <div className="space-y-1.5"><Label>Temporary password (8+ characters)</Label><Input type="text" value={f.password} onChange={e => setF({ ...f, password: e.target.value })} /></div>
          <div className="space-y-1.5">
            <Label>Role</Label>
            <div className="flex gap-2">
              {(["INVENTORY", "ADMIN"] as Role[]).map(r => (
                <Button key={r} type="button" size="sm" variant={f.role === r ? "default" : "outline"} onClick={() => setF({ ...f, role: r })}>{roleLabel[r]}</Button>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">Inventory managers handle stock and products and fulfil orders. Admins can do everything.</p>
          </div>
          {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button disabled={!valid || m.isPending} onClick={() => { setError(""); m.mutate(); }}>
            {m.isPending && <Loader2 className="h-4 w-4 animate-spin" />} Create
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function PasswordDialog({ user, onClose }: { user: UserRow; onClose: () => void }) {
  const { toast } = useToast();
  const [pw, setPw] = useState("");
  const [error, setError] = useState("");
  const m = useMutation({
    mutationFn: () => api(`/users/${user.id}/password`, { method: "PATCH", body: { password: pw } }),
    onSuccess: () => { toast({ title: "Password changed", description: user.name }); onClose(); },
    onError: (e: Error) => setError(e.message),
  });
  return (
    <Dialog open onOpenChange={o => { if (!o) onClose(); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Reset password</DialogTitle>
          <DialogDescription>{user.name} · {user.email}</DialogDescription>
        </DialogHeader>
        <div className="space-y-1.5"><Label>New password (8+ characters)</Label><Input type="text" value={pw} onChange={e => setPw(e.target.value)} autoFocus /></div>
        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button disabled={pw.length < 8 || m.isPending} onClick={() => { setError(""); m.mutate(); }}>
            {m.isPending && <Loader2 className="h-4 w-4 animate-spin" />} Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

const StaffPage = () => {
  const { user: me } = useAuth();
  const qc = useQueryClient();
  const { toast } = useToast();
  const [creating, setCreating] = useState(false);
  const [resetFor, setResetFor] = useState<UserRow | null>(null);

  const { data, isLoading, error } = useQuery({ queryKey: ["users"], queryFn: () => api<UserRow[]>("/users") });
  const staff = (data ?? []).filter(u => u.role !== "CUSTOMER");

  const onErr = (e: Error) => toast({ title: "Couldn't update", description: e.message, variant: "destructive" });
  const setActive = useMutation({
    mutationFn: (v: { id: string; isActive: boolean }) => api(`/users/${v.id}/active`, { method: "PATCH", body: { isActive: v.isActive } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["users"] }),
    onError: onErr,
  });
  const setRole = useMutation({
    mutationFn: (v: { id: string; role: Role }) => api(`/users/${v.id}/role`, { method: "PATCH", body: { role: v.role } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["users"] }),
    onError: onErr,
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-heading font-bold">Staff</h1>
          <p className="text-sm text-muted-foreground">Who can sign in to the back office, and what they can do.</p>
        </div>
        <Button onClick={() => setCreating(true)}><UserPlus className="h-4 w-4" /> Add staff</Button>
      </div>
      <Card>
        <CardContent className="p-0">
          {isLoading ? <Loader2 className="h-5 w-5 animate-spin mx-auto my-12 text-muted-foreground" />
            : error ? <p className="p-6 text-sm text-destructive">{(error as Error).message}</p>
            : (
              <Table>
                <TableHeader>
                  <TableRow><TableHead>Name</TableHead><TableHead>Role</TableHead><TableHead>Active</TableHead><TableHead className="text-right">Actions</TableHead></TableRow>
                </TableHeader>
                <TableBody>
                  {staff.map(u => {
                    const isMe = u.id === me?.id;
                    return (
                      <TableRow key={u.id}>
                        <TableCell>
                          <p className="font-medium">{u.name} {isMe && <Badge variant="outline" className="ml-1">You</Badge>}</p>
                          <p className="text-xs text-muted-foreground">{u.email}</p>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            {(["ADMIN", "INVENTORY"] as Role[]).map(r => (
                              <Button key={r} size="sm" variant={u.role === r ? "default" : "ghost"} disabled={isMe || setRole.isPending}
                                onClick={() => u.role !== r && setRole.mutate({ id: u.id, role: r })}>{roleLabel[r]}</Button>
                            ))}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Switch checked={u.isActive} disabled={isMe || setActive.isPending}
                            onCheckedChange={v => setActive.mutate({ id: u.id, isActive: v })} aria-label={`Active: ${u.name}`} />
                        </TableCell>
                        <TableCell className="text-right">
                          <Button size="sm" variant="outline" onClick={() => setResetFor(u)}><KeyRound className="h-3.5 w-3.5" /> Reset password</Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
        </CardContent>
      </Card>
      {creating && <CreateDialog onClose={() => setCreating(false)} />}
      {resetFor && <PasswordDialog user={resetFor} onClose={() => setResetFor(null)} />}
    </div>
  );
};

export default StaffPage;
