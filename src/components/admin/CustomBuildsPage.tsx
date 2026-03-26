import { useState } from "react";
import { Plus, Pencil, Trash2, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useCustomBuilds, BudgetRange, BuildRequest } from "@/contexts/CustomBuildsContext";
import { toast } from "sonner";

const STATUS_COLORS: Record<BuildRequest["status"], string> = {
  "New": "default",
  "In Progress": "secondary",
  "Quoted": "outline",
  "Completed": "default",
};

const CustomBuildsPage = () => {
  const { budgetRanges, setBudgetRanges, buildRequests, updateRequestStatus, deleteRequest } = useCustomBuilds();
  const [editingRange, setEditingRange] = useState<BudgetRange | null>(null);
  const [newLabel, setNewLabel] = useState("");
  const [newMin, setNewMin] = useState("");
  const [newMax, setNewMax] = useState("");
  const [addingNew, setAddingNew] = useState(false);

  function saveEdit(id: string) {
    if (!editingRange) return;
    setBudgetRanges(budgetRanges.map(r => r.id === id ? editingRange : r));
    setEditingRange(null);
    toast.success("Budget range updated");
  }

  function deleteRange(id: string) {
    setBudgetRanges(budgetRanges.filter(r => r.id !== id));
    toast.success("Budget range deleted");
  }

  function addRange() {
    if (!newLabel.trim()) { toast.error("Label is required"); return; }
    const range: BudgetRange = {
      id: Date.now().toString(),
      label: newLabel.trim(),
      minKes: Number(newMin) || 0,
      maxKes: newMax ? Number(newMax) : null,
    };
    setBudgetRanges([...budgetRanges, range]);
    setNewLabel(""); setNewMin(""); setNewMax("");
    setAddingNew(false);
    toast.success("Budget range added");
  }

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-heading font-bold">Custom PC Builds</h1>

      {/* Budget Ranges */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Budget Ranges</CardTitle>
          <Button size="sm" onClick={() => setAddingNew(true)}>
            <Plus className="h-4 w-4 mr-1" /> Add Range
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Label (shown to customers)</TableHead>
                <TableHead>Min (KES)</TableHead>
                <TableHead>Max (KES)</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {budgetRanges.map(range => (
                <TableRow key={range.id}>
                  {editingRange?.id === range.id ? (
                    <>
                      <TableCell>
                        <Input value={editingRange.label} onChange={e => setEditingRange({ ...editingRange, label: e.target.value })} className="h-8" />
                      </TableCell>
                      <TableCell>
                        <Input type="number" value={editingRange.minKes} onChange={e => setEditingRange({ ...editingRange, minKes: Number(e.target.value) })} className="h-8 w-28" />
                      </TableCell>
                      <TableCell>
                        <Input type="number" placeholder="No limit" value={editingRange.maxKes ?? ""} onChange={e => setEditingRange({ ...editingRange, maxKes: e.target.value ? Number(e.target.value) : null })} className="h-8 w-28" />
                      </TableCell>
                      <TableCell className="text-right space-x-1">
                        <Button size="sm" variant="ghost" onClick={() => saveEdit(range.id)}><Check className="h-4 w-4 text-green-500" /></Button>
                        <Button size="sm" variant="ghost" onClick={() => setEditingRange(null)}><X className="h-4 w-4" /></Button>
                      </TableCell>
                    </>
                  ) : (
                    <>
                      <TableCell className="font-medium">{range.label}</TableCell>
                      <TableCell>KES {range.minKes.toLocaleString()}</TableCell>
                      <TableCell>{range.maxKes ? `KES ${range.maxKes.toLocaleString()}` : "No limit"}</TableCell>
                      <TableCell className="text-right space-x-1">
                        <Button size="sm" variant="ghost" onClick={() => setEditingRange({ ...range })}><Pencil className="h-3.5 w-3.5" /></Button>
                        <Button size="sm" variant="ghost" onClick={() => deleteRange(range.id)}><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button>
                      </TableCell>
                    </>
                  )}
                </TableRow>
              ))}
              {addingNew && (
                <TableRow>
                  <TableCell><Input placeholder="e.g. KES 50,000 – 100,000" value={newLabel} onChange={e => setNewLabel(e.target.value)} className="h-8" /></TableCell>
                  <TableCell><Input type="number" placeholder="Min" value={newMin} onChange={e => setNewMin(e.target.value)} className="h-8 w-28" /></TableCell>
                  <TableCell><Input type="number" placeholder="Max (blank = no limit)" value={newMax} onChange={e => setNewMax(e.target.value)} className="h-8 w-28" /></TableCell>
                  <TableCell className="text-right space-x-1">
                    <Button size="sm" variant="ghost" onClick={addRange}><Check className="h-4 w-4 text-green-500" /></Button>
                    <Button size="sm" variant="ghost" onClick={() => setAddingNew(false)}><X className="h-4 w-4" /></Button>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Build Requests */}
      <Card>
        <CardHeader>
          <CardTitle>Build Requests ({buildRequests.length})</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {buildRequests.length === 0 ? (
            <p className="text-muted-foreground text-sm text-center py-10">No build requests yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Customer</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Build Type</TableHead>
                  <TableHead>Budget</TableHead>
                  <TableHead>Use Cases</TableHead>
                  <TableHead>Notes</TableHead>
                  <TableHead>Submitted</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {buildRequests.map(req => (
                  <TableRow key={req.id}>
                    <TableCell className="font-medium">{req.name}</TableCell>
                    <TableCell>{req.phone}</TableCell>
                    <TableCell>{req.buildType}</TableCell>
                    <TableCell className="text-sm">{req.budget}</TableCell>
                    <TableCell className="text-sm max-w-[160px]">
                      <div className="flex flex-wrap gap-1">
                        {req.useCases.map(u => (
                          <span key={u} className="text-[10px] bg-muted px-1.5 py-0.5 rounded">{u}</span>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground max-w-[140px] truncate">{req.notes || "—"}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{req.submittedAt}</TableCell>
                    <TableCell>
                      <Select value={req.status} onValueChange={v => updateRequestStatus(req.id, v as BuildRequest["status"])}>
                        <SelectTrigger className="h-7 text-xs w-28">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {(["New", "In Progress", "Quoted", "Completed"] as BuildRequest["status"][]).map(s => (
                            <SelectItem key={s} value={s}>{s}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" onClick={() => { deleteRequest(req.id); toast.success("Request deleted"); }}>
                        <Trash2 className="h-3.5 w-3.5 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default CustomBuildsPage;
