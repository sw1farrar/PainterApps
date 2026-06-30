"use client";

import Link, { useLinkStatus } from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  BarChart3,
  FileStack,
  FileText,
  HardHat,
  LayoutDashboard,
  Loader2,
  Package,
  Shield,
  Sparkles,
  UserPlus,
  Users,
  type LucideIcon,
} from "lucide-react";

import Logo from "@/components/Logo";
import { usePortalNavigation } from "@/components/portal/PortalNavigationProvider";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import type { NavItem } from "@/lib/auth/roles";

const ICON_MAP: Record<string, LucideIcon> = {
  sparkles: Sparkles,
  "layout-dashboard": LayoutDashboard,
  users: Users,
  "file-text": FileText,
  "file-stack": FileStack,
  package: Package,
  "hard-hat": HardHat,
  "user-plus": UserPlus,
  "bar-chart": BarChart3,
};

type AppSidebarProps = {
  navItems: NavItem[];
  siteAdminHref?: string;
  mobileOpen?: boolean;
  onMobileOpenChange?: (open: boolean) => void;
  pendingHref?: string | null;
};

function NavLinkIcon({
  icon: Icon,
  showSpinner,
}: {
  icon: LucideIcon;
  showSpinner: boolean;
}) {
  const { pending } = useLinkStatus();

  if (showSpinner || pending) {
    return <Loader2 className="h-4 w-4 shrink-0 animate-spin" aria-hidden />;
  }

  return <Icon className="h-4 w-4 shrink-0" />;
}

function SidebarNavLink({
  href,
  label,
  icon: Icon,
  isActive,
  isPending,
  onNavigate,
  onPrefetch,
}: {
  href: string;
  label: string;
  icon: LucideIcon;
  isActive: boolean;
  isPending?: boolean;
  onNavigate?: () => void;
  onPrefetch?: () => void;
}) {
  const { startNavigation } = usePortalNavigation();

  return (
    <Link
      href={href}
      prefetch={true}
      onMouseEnter={onPrefetch}
      onFocus={onPrefetch}
      onClick={() => {
        startNavigation(href);
        onNavigate?.();
      }}
      aria-current={isActive ? "page" : undefined}
      aria-busy={isPending}
      className={cn(
        "portal-nav-item nav-link-active flex min-h-11 items-center gap-3 rounded-lg border-l-2 px-3 py-2.5 text-sm font-medium transition-all duration-150 md:min-h-0",
        isActive
          ? "scale-[1.02] border-primary bg-primary/15 text-blue-200"
          : "border-transparent text-muted-foreground hover:scale-[1.01] hover:bg-accent hover:text-foreground",
        isPending && "border-primary/60 bg-primary/10 text-blue-100",
      )}
    >
      <NavLinkIcon icon={Icon} showSpinner={Boolean(isPending)} />
      {label}
    </Link>
  );
}

function NavLinks({
  navItems,
  siteAdminHref,
  pendingHref,
  onNavigate,
  stagger = false,
}: {
  navItems: NavItem[];
  siteAdminHref?: string;
  pendingHref?: string | null;
  onNavigate?: () => void;
  stagger?: boolean;
}) {
  const pathname = usePathname();
  const router = useRouter();

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
        const isPending =
          Boolean(pendingHref) &&
          (pendingHref === item.href || pendingHref?.startsWith(`${item.href}/`));

        return (
          <SidebarNavLink
            key={item.href}
            href={item.href}
            label={item.label}
            icon={Icon}
            isActive={isActive}
            isPending={isPending}
            onNavigate={onNavigate}
            onPrefetch={() => router.prefetch(item.href)}
          />
        );
      })}

      {siteAdminHref ? (
        <SiteAdminLink
          href={siteAdminHref}
          pathname={pathname}
          onNavigate={onNavigate}
          onPrefetch={() => router.prefetch(siteAdminHref)}
        />
      ) : null}
    </nav>
  );
}

function SiteAdminLink({
  href,
  pathname,
  onNavigate,
  onPrefetch,
}: {
  href: string;
  pathname: string;
  onNavigate?: () => void;
  onPrefetch: () => void;
}) {
  const { startNavigation } = usePortalNavigation();

  return (
        <Link
          href={href}
          prefetch={true}
          onMouseEnter={onPrefetch}
          onFocus={onPrefetch}
          onClick={() => {
            startNavigation(href);
            onNavigate?.();
          }}
          className={cn(
            "portal-nav-item mt-4 flex min-h-11 items-center gap-3 rounded-lg border border-amber-400/25 bg-amber-400/10 px-3 py-2.5 text-sm font-medium text-amber-100 transition hover:bg-amber-400/15",
            (pathname === href || pathname.startsWith(`${href}/`)) &&
              "border-amber-300/40 bg-amber-400/20",
          )}
        >
          <Shield className="h-4 w-4 shrink-0" />
          Site admin
        </Link>
  );
}

export function AppSidebar({
  navItems,
  siteAdminHref,
  mobileOpen = false,
  onMobileOpenChange,
  pendingHref = null,
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
    <div className="flex items-center border-b border-border px-5 py-5">
      <Logo size="sm" />
    </div>
  );

  return (
    <>
      <aside className="hidden h-dvh w-64 shrink-0 flex-col border-r border-border bg-navy-900/50 md:flex">
        {sidebarHeader}
        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
          <NavLinks
            navItems={navItems}
            siteAdminHref={siteAdminHref}
            pendingHref={pendingHref}
          />
        </div>
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
            siteAdminHref={siteAdminHref}
            pendingHref={pendingHref}
            stagger
            onNavigate={() => onMobileOpenChange?.(false)}
          />
        </SheetContent>
      </Sheet>
    </>
  );
}