import { useEffect, useState } from "react";
import { useSearchParams } from "@/lib/router";
import { useQuery } from "@tanstack/react-query";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { api } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import OrdersTable from "./OrdersTable";

interface Counts { [lane: string]: { count: number; oldest: string | null } }

const OFFICE_TABS: { lane: string; label: string; empty: string }[] = [
  { lane: "verify", label: "Verify payment", empty: "No M-Pesa codes are waiting to be checked." },
  { lane: "review", label: "Ready to approve", empty: "No paid orders are waiting for office approval." },
  { lane: "payment", label: "Awaiting payment", empty: "No orders are waiting for payment." },
  { lane: "warehouse", label: "In the warehouse", empty: "Nothing is in the warehouse right now." },
  { lane: "attention", label: "Needs attention", empty: "Nothing needs a decision. Nice." },
  { lane: "closed", label: "Completed / cancelled", empty: "No closed orders yet." },
  { lane: "", label: "All", empty: "No orders yet. They'll show up here the moment a customer checks out." },
];
// inventory staff only see the warehouse side
const INVENTORY_TABS = OFFICE_TABS.filter(t => ["warehouse", "closed", ""].includes(t.lane));

const OrderManagement = () => {
  const { user } = useAuth();
  const [params, setParams] = useSearchParams();
  const tabs = user?.role === "ADMIN" ? OFFICE_TABS : INVENTORY_TABS;
  const lane = params.get("lane") ?? tabs[0].lane;
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");

  useEffect(() => {
    const t = setTimeout(() => setDebounced(search.trim()), 300);
    return () => clearTimeout(t);
  }, [search]);

  const { data: counts } = useQuery({ queryKey: ["orders", "counts"], queryFn: () => api<Counts>("/orders/counts"), refetchInterval: 20_000 });
  const current = tabs.find(t => t.lane === lane) ?? tabs[0];

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-heading font-bold">Orders</h1>
      <div className="flex flex-wrap items-center gap-2">
        {tabs.map(t => {
          const n = t.lane ? counts?.[t.lane]?.count : undefined;
          const active = t.lane === lane;
          const urgent = ["verify", "review", "attention"].includes(t.lane) && !!n;
          return (
            <button key={t.lane || "all"} onClick={() => setParams(t.lane === tabs[0].lane ? {} : { lane: t.lane })}
              className={`text-sm px-3 py-1.5 rounded-full border transition-colors flex items-center gap-2 ${active ? "bg-primary text-primary-foreground border-primary" : "hover:bg-muted"}`}>
              {t.label}
              {n ? <span className={`text-xs rounded-full px-1.5 ${active ? "bg-primary-foreground/20" : urgent ? "bg-amber-500/20 text-amber-600 dark:text-amber-400" : "bg-muted"}`}>{n}</span> : null}
            </button>
          );
        })}
        <div className="relative ml-auto w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Order no., customer or phone…" className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
      </div>
      <OrdersTable lane={current.lane || undefined} search={debounced} empty={current.empty} />
    </div>
  );
};

export default OrderManagement;
