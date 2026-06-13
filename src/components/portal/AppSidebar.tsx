"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  FileText,
  HardHat,
  LayoutDashboard,
  UserPlus,
  Users,
  type LucideIcon,
} from "lucide-react";

import Logo from "@/components/Logo";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import type { NavItem } from "@/lib/auth/roles";

const ICON_MAP: Record<string, LucideIcon> = {
  "layout-dashboard": LayoutDashboard,
  users: Users,
  "file-text": FileText,
  "hard-hat": HardHat,
  "user-plus": UserPlus,
  "bar-chart": BarChart3,
};

type AppSidebarProps = {
  navItems: NavItem[];
  companyName?: string | null;
  mobileOpen?: boolean;
  onMobileOpenChange?: (open: boolean) => void;
};

function NavLinks({
  navItems,
  onNavigate,
}: {
  navItems: NavItem[];
  onNavigate?: () => void;
}) {
  const pathname = usePathname();

  return (
    <nav className="flex flex-1 flex-col gap-1 px-3 py-4">
      {navItems.map((item) => {
        const Icon = ICON_MAP[item.icon] ?? LayoutDashboard;
        const isActive =
          pathname === item.href || pathname.startsWith(`${item.href}/`);

        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
              isActive
                ? "bg-primary/15 text-blue-200"
                : "text-muted-foreground hover:bg-accent hover:text-foreground",
            )}
          >
            <Icon className="h-4 w-4 shrink-0" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

export function AppSidebar({
  navItems,
  companyName,
  mobileOpen = false,
  onMobileOpenChange,
}: AppSidebarProps) {
  const sidebarHeader = (
    <div className="flex items-center gap-3 border-b border-border px-5 py-5">
      <Logo size="sm" />
      {companyName ? (
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-foreground">
            {companyName}
          </p>
          <p className="text-xs text-muted-foreground">Portal</p>
        </div>
      ) : null}
    </div>
  );

  return (
    <>
      <aside className="hidden h-full w-64 shrink-0 flex-col border-r border-border bg-navy-900/50 md:flex">
        {sidebarHeader}
        <NavLinks navItems={navItems} />
      </aside>

      <Sheet open={mobileOpen} onOpenChange={onMobileOpenChange}>
        <SheetContent
          side="left"
          className="flex w-[280px] max-w-[85vw] flex-col gap-0 border-border bg-navy-900 p-0"
        >
          {sidebarHeader}
          <NavLinks
            navItems={navItems}
            onNavigate={() => onMobileOpenChange?.(false)}
          />
        </SheetContent>
      </Sheet>
    </>
  );
}