import { createRoot } from "react-dom/client";
import { ThemeProvider } from "next-themes";
import App from "./App.tsx";
import { SiteConfigProvider } from "./contexts/SiteConfigContext.tsx";
import { CartProvider } from "./contexts/CartContext.tsx";
import { ProductsProvider } from "./contexts/ProductsContext.tsx";
import { CustomBuildsProvider } from "./contexts/CustomBuildsContext.tsx";
import "./index.css";

createRoot(document.getElementById("root")!).render(
  <SiteConfigProvider>
    <ProductsProvider>
      <CustomBuildsProvider>
        <CartProvider>
          <ThemeProvider attribute="class" defaultTheme="system">
            <App />
          </ThemeProvider>
        </CartProvider>
      </CustomBuildsProvider>
    </ProductsProvider>
  </SiteConfigProvider>
);
