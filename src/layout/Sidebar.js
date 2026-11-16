"use client";

import {
  Home,
  User,
  Users,
  Calendar,
  Newspaper,
  MessageCircle,
  LogOut,
  Shield,
  Settings,
  HelpCircle,
  Bell,
  Search,
  Plus,
  Edit,
  Ban,
} from "lucide-react";

import Link from "next/link";
import { useCallback, useEffect, useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import { getMenuPermissions, permissionForPage } from '@/src/lib/adminPagePermissions';
import Image from "next/image";

import {
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
} from "@/components/ui/sidebar";
import { SignOutButton } from "@/src/element/SignOutButton";

const overview = [
  {
    title: "Overview",
    url: "/",
    icon: Home,
  },
];

const featureTypes = [
  {
    title: "Permintaan Akun",
    url: "/account-requests",
    icon: Shield,
  },
  {
    title: "Alumni",
    url: "/alumni",
    icon: User,
  },
  {
    title: "Komunitas",
    url: "/komunitas",
    icon: Users,
  },
  {
    title: "Kegiatan",
    url: "/kegiatan",
    icon: Calendar,
  },
  {
    title: "Tantangan",
    url: "/tantangan",
    icon: Plus,
  },
  {
    title: "Kontribusi",
    url: "/kontribusi",
    icon: Edit,
  },
  {
    title: "Berita",
    url: "/berita",
    icon: Newspaper,
  },
  {
    title: "Moderasi Pesan",
    url: "/messages",
    icon: MessageCircle,
  },
  {
    title: "Chat Admin",
    url: "/tickets",
    icon: HelpCircle,
  },
];

const blacklists = [
  {
    title: "Blacklists",
    url: "/blacklists",
    icon: Ban,
  },
];

const admins = [
  {
    title: "Manage",
    url: "/manage-admin",
    icon: User,
  },
  {
    title: "Roles & Permissions",
    url: "/admin-roles",
    icon: Shield,
  },
];

export function AppSidebar() {
  const [client] = useState(createClient);
  const [allowed, setAllowed] = useState(new Set());
  const [menuError, setMenuError] = useState(false);
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    let active = true;
    getMenuPermissions(client).then(permissions => {
      if (active) { setAllowed(permissions); setMenuError(false); }
    }).catch(() => { if (active) { setAllowed(new Set()); setMenuError(true); } });
    return () => { active = false; };
  }, [client, revision]);
  const visible = useCallback(item => allowed.has(permissionForPage(item.url)), [allowed]);
  return (
    <Sidebar>
      <SidebarHeader className="p-4">
        <div className="flex items-center gap-2">
          <Image
            src="/assets/satu-teladan.png"
            alt="Logo"
            width={32}
            height={32}
            className="rounded-full"
          />
          <span className="font-semibold text-gray-900">
            Satu Teladan
            <br />
            Admin Dashboard
          </span>
        </div>
      </SidebarHeader>
      <SidebarContent>
        {menuError && <div role="alert" className="p-3 text-sm text-red-800">Akses menu belum dapat dimuat.<button onClick={() => setRevision(value => value + 1)} className="min-h-11 px-2 underline">Coba Lagi</button></div>}
        <SidebarGroup>
          <SidebarGroupLabel>Dashboards</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {overview.filter(visible).map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <Link href={item.url} className="flex items-center gap-2">
                      <item.icon className="w-4 h-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Feature Types</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {featureTypes.filter(visible).map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <Link href={item.url} className="flex items-center gap-2">
                      <item.icon className="w-4 h-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Blacklist</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {blacklists.filter(visible).map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <Link href={item.url} className="flex items-center gap-2">
                      <item.icon className="w-4 h-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Admin</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {admins.filter(visible).map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <Link href={item.url} className="flex items-center gap-2">
                      <item.icon className="w-4 h-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="p-4">
        <SignOutButton />
      </SidebarFooter>
    </Sidebar>
  );
}
