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
import DisposalManagement from "./components/admin/DisposalManagement.tsx";
import InventoryPage from "./components/admin/InventoryPage.tsx";
import OrderWorkspace from "./components/admin/OrderWorkspace.tsx";
import ShopSetupPage from "./components/admin/ShopSetupPage.tsx";
import { ReturnsList, ReturnDetail } from "./components/admin/ReturnsPages.tsx";
import StaffPage from "./components/admin/StaffPage.tsx";
import AdminLogin from "./pages/AdminLogin.tsx";
import TrackOrderPage from "./pages/TrackOrderPage.tsx";
import ReturnRequestPage from "./pages/ReturnRequestPage.tsx";
import { AccountPage, AccountOrderPage, LoginPage } from "./pages/AccountPages.tsx";
import CartPage from "./pages/CartPage.tsx";
import CheckoutPage from "./pages/CheckoutPage.tsx";
import ProductDetailPage from "./pages/ProductDetailPage.tsx";

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, refetchOnWindowFocus: true, staleTime: 5_000 } },
});

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
          <Route path="/track" element={<TrackOrderPage />} />
          <Route path="/returns" element={<ReturnRequestPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<LoginPage register />} />
          <Route path="/account" element={<AccountPage />} />
          <Route path="/account/orders/:orderNumber" element={<AccountOrderPage />} />
          <Route path="/admin/login" element={<AdminLogin />} />
          <Route path="/admin" element={<AdminLayout />}>
            <Route index element={<DashboardOverview />} />
            <Route path="products" element={<ProductManagement />} />
            <Route path="orders" element={<OrderManagement />} />
            <Route path="orders/:orderId" element={<OrderWorkspace />} />
            <Route path="returns" element={<ReturnsList />} />
            <Route path="returns/:returnId" element={<ReturnDetail />} />
            <Route path="shop-setup" element={<ShopSetupPage />} />
            <Route path="inventory/*" element={<InventoryPage />} />
            <Route path="staff" element={<StaffPage />} />
            <Route path="repairs" element={<RepairManagement />} />
            <Route path="tickets/:ticketId" element={<RepairTicketView />} />
            <Route path="reports" element={<ReportsPage />} />
            <Route path="custom-builds" element={<CustomBuildsPage />} />
            <Route path="disposal" element={<DisposalManagement />} />
            <Route path="settings" element={<SiteSettingsPage />} />
          </Route>
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
