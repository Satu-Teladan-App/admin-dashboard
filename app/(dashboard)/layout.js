import AdminPermissionGate from '@/src/element/AdminPermissionGate';
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/src/layout/Sidebar";

export default function DashboardLayout({ children }) {
  return (
    <SidebarProvider>
      <AppSidebar />
      <main className="min-w-0 flex-1"><AdminPermissionGate>{children}</AdminPermissionGate></main>
    </SidebarProvider>
  );
}
