"use client";

import { Suspense } from "react";
import ReturnRequestPage from "@/views/ReturnRequestPage";

export default function Page() {
  return <Suspense fallback={null}><ReturnRequestPage /></Suspense>;
}
