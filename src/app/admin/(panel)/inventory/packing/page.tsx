"use client";

import { InventoryLane } from "@/components/admin/InventoryPage";

export default function Page() {
  return <InventoryLane title="Packing" intro="Everything picked: check each item into the box, then mark it packed." lane="packing" empty="Nothing is waiting to be packed." />;
}
