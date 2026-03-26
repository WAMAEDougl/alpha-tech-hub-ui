import { createRoot } from "react-dom/client";
import { ThemeProvider } from "next-themes";
import App from "./App.tsx";
import { SiteConfigProvider } from "./contexts/SiteConfigContext.tsx";
import { CartProvider } from "./contexts/CartContext.tsx";
import "./index.css";

createRoot(document.getElementById("root")!).render(
  <SiteConfigProvider>
    <CartProvider>
      <ThemeProvider attribute="class" defaultTheme="system">
        <App />
      </ThemeProvider>
    </CartProvider>
  </SiteConfigProvider>
);
