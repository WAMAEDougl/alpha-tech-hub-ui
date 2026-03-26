import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Index from "./pages/Index.tsx";
import NotFound from "./pages/NotFound.tsx";
import AdminLayout from "./pages/AdminLayout.tsx";
import DashboardOverview from "./components/admin/DashboardOverview.tsx";
import ProductManagement from "./components/admin/ProductManagement.tsx";
import OrderManagement from "./components/admin/OrderManagement.tsx";
import RepairManagement from "./components/admin/RepairManagement.tsx";
import RepairTicketView from "./components/admin/RepairTicketView.tsx";
import SiteSettingsPage from "./components/admin/SiteSettingsPage.tsx";
import ReportsPage from "./components/admin/ReportsPage.tsx";
import CustomBuildsPage from "./components/admin/CustomBuildsPage.tsx";
import CartPage from "./pages/CartPage.tsx";
import CheckoutPage from "./pages/CheckoutPage.tsx";
import ProductDetailPage from "./pages/ProductDetailPage.tsx";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/cart" element={<CartPage />} />
          <Route path="/checkout" element={<CheckoutPage />} />
          <Route path="/products/:id" element={<ProductDetailPage />} />
          <Route path="/admin" element={<AdminLayout />}>
            <Route index element={<DashboardOverview />} />
            <Route path="products" element={<ProductManagement />} />
            <Route path="orders" element={<OrderManagement />} />
            <Route path="repairs" element={<RepairManagement />} />
            <Route path="tickets/:ticketId" element={<RepairTicketView />} />
            <Route path="reports" element={<ReportsPage />} />
            <Route path="custom-builds" element={<CustomBuildsPage />} />
            <Route path="settings" element={<SiteSettingsPage />} />
          </Route>
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
