import type { Metadata } from "next";

// The back office is never listed in search results.
export const metadata: Metadata = { title: "Admin | Alpha Computers Nanyuki", robots: { index: false, follow: false } };

export default function AdminRoot({ children }: { children: React.ReactNode }) {
  return children;
}
