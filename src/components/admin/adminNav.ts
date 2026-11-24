import {
  LayoutDashboard, Package, ShoppingBag, Wrench, Settings, BarChart2, Cpu, Recycle,
  Warehouse, Users, Undo2, SlidersHorizontal,
} from "lucide-react";
import { canAccess, type Role } from "@/contexts/AuthContext";

export const navItems = [
  { icon: LayoutDashboard, label: "Dashboard", path: "/admin" },
  { icon: ShoppingBag, label: "Orders", path: "/admin/orders" },
  { icon: Warehouse, label: "Inventory", path: "/admin/inventory" },
  { icon: Undo2, label: "Returns", path: "/admin/returns" },
  { icon: Package, label: "Products", path: "/admin/products" },
  { icon: SlidersHorizontal, label: "Shop setup", path: "/admin/shop-setup" },
  { icon: Wrench, label: "Repairs", path: "/admin/repairs" },
  { icon: Cpu, label: "Custom Builds", path: "/admin/custom-builds" },
  { icon: Recycle, label: "Disposal", path: "/admin/disposal" },
  { icon: BarChart2, label: "Reports", path: "/admin/reports" },
  { icon: Users, label: "Staff", path: "/admin/staff" },
  { icon: Settings, label: "Settings", path: "/admin/settings" },
];

export const navFor = (role: Role | undefined) => navItems.filter(i => canAccess(role, i.path));

export const roleLabel: Record<Role, string> = {
  ADMIN: "Administrator",
  INVENTORY: "Inventory manager",
  CUSTOMER: "Customer",
};
