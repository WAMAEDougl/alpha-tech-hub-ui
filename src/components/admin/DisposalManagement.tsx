import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useDisposal, DisposalRequest } from "@/contexts/DisposalContext";
import { toast } from "sonner";

const STATUS_VARIANT: Record<DisposalRequest["status"], "default" | "secondary" | "outline" | "destructive"> = {
  Pending: "secondary",
  Confirmed: "default",
  Received: "outline",
  Processed: "default",
};

const DisposalManagement = () => {
  const { requests, updateStatus, deleteRequest } = useDisposal();

  const counts = {
    Pending: requests.filter(r => r.status === "Pending").length,
    Confirmed: requests.filter(r => r.status === "Confirmed").length,
    Received: requests.filter(r => r.status === "Received").length,
    Processed: requests.filter(r => r.status === "Processed").length,
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-heading font-bold">E-Waste Disposal Requests</h1>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {(["Pending", "Confirmed", "Received", "Processed"] as DisposalRequest["status"][]).map(s => (
          <Card key={s}>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-primary">{counts[s]}</p>
              <p className="text-sm text-muted-foreground">{s}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Requests ({requests.length})</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {requests.length === 0 ? (
            <p className="text-muted-foreground text-sm text-center py-10">No disposal requests yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Customer</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Items</TableHead>
                    <TableHead>Qty</TableHead>
                    <TableHead>Preferred Date</TableHead>
                    <TableHead>Notes</TableHead>
                    <TableHead>Submitted</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {requests.map(req => (
                    <TableRow key={req.id}>
                      <TableCell className="font-medium whitespace-nowrap">{req.name}</TableCell>
                      <TableCell className="whitespace-nowrap">{req.phone}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{req.email || "—"}</TableCell>
                      <TableCell className="text-sm max-w-[180px]">{req.items}</TableCell>
                      <TableCell>{req.quantity}</TableCell>
                      <TableCell className="text-sm whitespace-nowrap">{req.preferredDate || "Flexible"}</TableCell>
                      <TableCell className="text-sm text-muted-foreground max-w-[140px] truncate">{req.notes || "—"}</TableCell>
                      <TableCell className="text-xs text-muted-foreground whitespace-nowrap">{req.submittedAt}</TableCell>
                      <TableCell>
                        <Select value={req.status} onValueChange={v => updateStatus(req.id, v as DisposalRequest["status"])}>
                          <SelectTrigger className="h-7 text-xs w-28">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {(["Pending", "Confirmed", "Received", "Processed"] as DisposalRequest["status"][]).map(s => (
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
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default DisposalManagement;
