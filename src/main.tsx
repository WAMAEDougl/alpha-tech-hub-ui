import { createRoot } from "react-dom/client";
import { ThemeProvider } from "next-themes";
import App from "./App.tsx";
import { SiteConfigProvider } from "./contexts/SiteConfigContext.tsx";
import { CartProvider } from "./contexts/CartContext.tsx";
import { ProductsProvider } from "./contexts/ProductsContext.tsx";
import { CustomBuildsProvider } from "./contexts/CustomBuildsContext.tsx";
import { DisposalProvider } from "./contexts/DisposalContext.tsx";
import { ServicesProvider } from "./contexts/ServicesContext.tsx";
import "./index.css";

createRoot(document.getElementById("root")!).render(
  <SiteConfigProvider>
    <ProductsProvider>
      <ServicesProvider>
        <CustomBuildsProvider>
          <DisposalProvider>
            <CartProvider>
              <ThemeProvider attribute="class" defaultTheme="system">
                <App />
              </ThemeProvider>
            </CartProvider>
          </DisposalProvider>
        </CustomBuildsProvider>
      </ServicesProvider>
    </ProductsProvider>
  </SiteConfigProvider>
);
