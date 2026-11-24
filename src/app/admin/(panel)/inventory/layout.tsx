"use client";

import { InventoryShell } from "@/components/admin/InventoryPage";

export default function InventoryLayout({ children }: { children: React.ReactNode }) {
  return <InventoryShell>{children}</InventoryShell>;
}
