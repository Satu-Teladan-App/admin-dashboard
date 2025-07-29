"use client";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";

import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/src/layout/Sidebar";
import { usePathname } from "next/navigation";

export default function RootLayout({ children }) {
  return (
    <html lang="id">
      <body className={`antialiased`}>
        <ConditionalLayout>{children}</ConditionalLayout>
        <Toaster />
      </body>
    </html>
  );
}

function ConditionalLayout({ children }) {
  const pathname = usePathname();

  if (pathname === "/sign-in") {
    return <main>{children}</main>;
  }

  return (
    <SidebarProvider>
      <AppSidebar />
      <main>
        <SidebarTrigger />
        {children}
      </main>
    </SidebarProvider>
  );
}
