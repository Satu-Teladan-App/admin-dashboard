import { SidebarTrigger } from "@/components/ui/sidebar";

export default function HeaderPage({ children }) {
  return (
    <header className="sticky top-0 z-9 flex h-16 shrink-0 items-center gap-2 border-b bg-background px-4">
      <SidebarTrigger className="-ml-1" />
      <div className="h-4 w-px bg-border" />
      <div className="flex flex-1 items-center gap-2 px-3">{children}</div>
    </header>
  );
}
