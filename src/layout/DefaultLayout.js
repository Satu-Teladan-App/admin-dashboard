"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/utils/supabase/client";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "./Sidebar";
import { Toaster } from "@/components/ui/sonner";
import { cn } from "@/lib/utils";

export default function DefaultLayout({ className, children, ...props }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (user) {
          // Check if user has admin role
          const { data: adminRoles } = await supabase
            .from("admin_roles")
            .select("*")
            .eq("user_id", user.id);

          setIsAuthenticated(adminRoles && adminRoles.length > 0);
        } else {
          setIsAuthenticated(false);
        }
      } catch (error) {
        console.error("Auth check error:", error);
        setIsAuthenticated(false);
      } finally {
        setLoading(false);
      }
    };

    checkAuth();

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === "SIGNED_OUT" || !session) {
        setIsAuthenticated(false);
      } else if (event === "SIGNED_IN" && session) {
        const { data: adminRoles } = await supabase
          .from("admin_roles")
          .select("*")
          .eq("user_id", session.user.id);

        setIsAuthenticated(adminRoles && adminRoles.length > 0);
      }
    });

    return () => subscription.unsubscribe();
  }, [supabase]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  // If not authenticated, render children without sidebar
  if (!isAuthenticated) {
    return (
      <>
        <main className="min-h-screen">{children}</main>
        <Toaster />
      </>
    );
  }

  // If authenticated, render with sidebar
  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full">
        <AppSidebar />
        <main className="flex-1 p-6 bg-gray-50">{children}</main>
      </div>
      <Toaster />
    </SidebarProvider>
  );
}
