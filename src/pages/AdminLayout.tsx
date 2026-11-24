import { Outlet } from "react-router-dom";
import AdminSidebar from "@/components/admin/AdminSidebar";
import AdminMobileNav from "@/components/admin/AdminMobileNav";
import RequireStaff from "@/components/admin/RequireStaff";
import OrderAlerts from "@/components/admin/OrderAlerts";
import { useAuth } from "@/contexts/AuthContext";

const Shell = () => {
  const { user } = useAuth();
  return (
    <div className="min-h-screen flex flex-col md:flex-row w-full bg-background text-foreground">
      <AdminSidebar />
      <div className="flex flex-col flex-1 min-h-screen min-w-0">
        <AdminMobileNav />
        <main className="flex-1 p-4 md:p-6 overflow-auto">
          {user && <OrderAlerts />}
          <RequireStaff checkPath>
            <Outlet />
          </RequireStaff>
        </main>
      </div>
    </div>
  );
};

// No hard-coded "dark" class: the admin follows the light/dark toggle like the rest of the app.
const AdminLayout = () => (
  <RequireStaff>
    <Shell />
  </RequireStaff>
);

export default AdminLayout;
