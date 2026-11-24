"use client";

import { Suspense } from "react";
import { LoginPage } from "@/views/AccountPages";

export default function Page() {
  return <Suspense fallback={null}><LoginPage /></Suspense>;
}
