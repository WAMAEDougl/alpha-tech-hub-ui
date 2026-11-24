"use client";

import { Suspense } from "react";
import AdminLayout from "@/views/AdminLayout";

export default function PanelLayout({ children }: { children: React.ReactNode }) {
  return (
    <AdminLayout>
      <Suspense fallback={null}>{children}</Suspense>
    </AdminLayout>
  );
}
