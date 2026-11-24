"use client";

import { useState } from "react";
import { ThemeProvider } from "next-themes";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SiteConfigProvider } from "@/contexts/SiteConfigContext";
import { ProductsProvider } from "@/contexts/ProductsContext";
import { ServicesProvider } from "@/contexts/ServicesContext";
import { CustomBuildsProvider } from "@/contexts/CustomBuildsContext";
import { DisposalProvider } from "@/contexts/DisposalContext";
import { CartProvider } from "@/contexts/CartContext";
import { AuthProvider } from "@/contexts/AuthContext";

export default function Providers({ children }: { children: React.ReactNode }) {
  // one query cache per browser tab (created inside state so it is not shared between visitors on the server)
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: { queries: { retry: 1, refetchOnWindowFocus: true, staleTime: 5_000 } },
  }));

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
        <SiteConfigProvider>
          <ProductsProvider>
            <ServicesProvider>
              <CustomBuildsProvider>
                <DisposalProvider>
                  <CartProvider>
                    <AuthProvider>
                      <TooltipProvider>
                        <Toaster />
                        <Sonner />
                        {children}
                      </TooltipProvider>
                    </AuthProvider>
                  </CartProvider>
                </DisposalProvider>
              </CustomBuildsProvider>
            </ServicesProvider>
          </ProductsProvider>
        </SiteConfigProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
