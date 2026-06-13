"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
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
  stagger = false,
}: {
  navItems: NavItem[];
  onNavigate?: () => void;
  stagger?: boolean;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [pendingHref, setPendingHref] = useState<string | null>(null);

  useEffect(() => {
    setPendingHref(null);
  }, [pathname]);

  const handleNavigate = (href: string) => {
    if (href === pathname) {
      onNavigate?.();
      return;
    }

    setPendingHref(href);
    startTransition(() => {
      router.push(href);
      onNavigate?.();
    });
  };

  return (
    <nav
      className={cn(
        "flex flex-1 flex-col gap-1 px-3 py-4",
        stagger && "portal-nav-stagger",
      )}
    >
      {navItems.map((item) => {
        const Icon = ICON_MAP[item.icon] ?? LayoutDashboard;
        const isActive =
          pathname === item.href || pathname.startsWith(`${item.href}/`);
        const isNavigating = isPending && pendingHref === item.href;

        return (
          <Link
            key={item.href}
            href={item.href}
            prefetch={true}
            onClick={(event) => {
              event.preventDefault();
              handleNavigate(item.href);
            }}
            aria-current={isActive ? "page" : undefined}
            className={cn(
              "portal-nav-item nav-link-active flex min-h-11 items-center gap-3 rounded-lg border-l-2 px-3 py-2.5 text-sm font-medium transition-all duration-150 md:min-h-0",
              isActive
                ? "scale-[1.02] border-primary bg-primary/15 text-blue-200"
                : "border-transparent text-muted-foreground hover:scale-[1.01] hover:bg-accent hover:text-foreground",
              isNavigating && "pointer-events-none opacity-50",
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
  const pathname = usePathname();
  const [staggerKey, setStaggerKey] = useState(0);

  useEffect(() => {
    onMobileOpenChange?.(false);
  }, [pathname, onMobileOpenChange]);

  useEffect(() => {
    if (mobileOpen) {
      setStaggerKey((key) => key + 1);
    }
  }, [mobileOpen]);

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
            key={staggerKey}
            navItems={navItems}
            stagger
            onNavigate={() => onMobileOpenChange?.(false)}
          />
        </SheetContent>
      </Sheet>
    </>
  );
}