"use client";

import { InventoryLane } from "@/components/admin/InventoryPage";

export default function Page() {
  return <InventoryLane title="Handoffs" intro="Packed orders waiting for a rider or for the customer, and orders currently out." lane="handoffs" empty="Nothing is waiting for handoff." />;
}
