"use client";

import { Suspense } from "react";
import TrackOrderPage from "@/views/TrackOrderPage";

export default function Page() {
  return <Suspense fallback={null}><TrackOrderPage /></Suspense>;
}
