import { Outlet } from "react-router-dom";
import AdminSidebar from "@/components/admin/AdminSidebar";

const AdminLayout = () => {
  return (
    <div className="dark min-h-screen flex w-full bg-background text-foreground">
      <AdminSidebar />
      <main className="flex-1 p-6 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
};

export default AdminLayout;
