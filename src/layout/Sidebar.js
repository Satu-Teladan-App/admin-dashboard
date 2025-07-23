import {
  Home,
  User,
  Users,
  Calendar,
  Newspaper,
  Wallet,
  MessageCircle,
} from "lucide-react";

import Link from "next/link";
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
} from "@/components/ui/sidebar";

const overview = [
  {
    title: "Overview",
    url: "/",
    icon: Home,
  },
];

const items = [
  {
    title: "Akun",
    url: "/akun",
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
    title: "Berita",
    url: "/berita",
    icon: Newspaper,
  },
  {
    title: "Pendanaan",
    url: "/pendanaan",
    icon: Wallet,
  },
  {
    title: "Pesan",
    url: "/pesan",
    icon: MessageCircle,
  },
];

export function AppSidebar() {
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
            Satu Teladan Admin Dashboard
          </span>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Dashboards</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {overview.map((item) => (
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
          <SidebarGroupLabel>Verifikasi</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => (
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
    </Sidebar>
  );
}
