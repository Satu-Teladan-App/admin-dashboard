import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/src/layout/Sidebar";

export default function DashboardLayout({ children }) {
  return (
    <SidebarProvider>
      <AppSidebar />
      <main>{children}</main>
    </SidebarProvider>
  );
}
