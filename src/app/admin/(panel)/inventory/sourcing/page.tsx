"use client";

import { InventoryLane } from "@/components/admin/InventoryPage";

export default function Page() {
  return <InventoryLane title="Orders to source & pick" intro="Approved orders. Pick from the shelf, or receive from a supplier for any shortfall. Oldest first." lane="sourcing" empty="Nothing to source or pick. New work appears here once the office approves an order." />;
}
