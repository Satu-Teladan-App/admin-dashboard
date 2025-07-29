import {
  Home,
  User,
  Users,
  Calendar,
  Newspaper,
  Wallet,
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
    title: "Pendanaan",
    url: "/pendanaan",
    icon: Wallet,
  },
  {
    title: "Berita",
    url: "/berita",
    icon: Newspaper,
  },
  {
    title: "Messages",
    url: "/messages",
    icon: MessageCircle,
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
          <SidebarGroupLabel>Feature Types</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {featureTypes.map((item) => (
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
              {blacklists.map((item) => (
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
              {admins.map((item) => (
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
