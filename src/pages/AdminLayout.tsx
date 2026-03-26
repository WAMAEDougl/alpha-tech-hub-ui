import { Outlet } from "react-router-dom";
import AdminSidebar from "@/components/admin/AdminSidebar";
import AdminMobileNav from "@/components/admin/AdminMobileNav";

const AdminLayout = () => {
  return (
    <div className="dark min-h-screen flex flex-col md:flex-row w-full bg-background text-foreground">
      <AdminSidebar />
      <div className="flex flex-col flex-1 min-h-screen">
        <AdminMobileNav />
        <main className="flex-1 p-6 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;
