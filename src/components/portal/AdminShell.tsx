"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  ArrowLeft,
  LayoutDashboard,
  LogOut,
  Package,
  Settings,
  Shield,
  User,
  UserPlus,
  Users,
} from "lucide-react";
import { toast } from "sonner";

import Logo from "@/components/Logo";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { getUserInitials } from "@/lib/auth/display";
import type { AppSession } from "@/lib/auth/app-session";
import { createClient } from "@/lib/supabase/client";
import { getSupabaseEnvError } from "@/lib/supabase/env";
import { cn } from "@/lib/utils";

const ADMIN_LINKS = [
  { href: "/app/admin", label: "Overview", icon: LayoutDashboard },
  { href: "/app/admin/companies", label: "Companies", icon: Users },
  { href: "/app/admin/users", label: "Users", icon: UserPlus },
  { href: "/app/admin/product-catalog", label: "Product Catalog", icon: Package },
  { href: "/app/admin/settings", label: "Settings", icon: Settings },
  { href: "/app/admin/account", label: "Account", icon: User },
];

type AdminShellProps = {
  session: AppSession;
  children: React.ReactNode;
};

export function AdminShell({ session, children }: AdminShellProps) {
  const pathname = usePathname();
  const router = useRouter();

  async function handleLogout() {
    const envError = getSupabaseEnvError();
    if (envError) {
      toast.error(envError);
      return;
    }

    const supabase = createClient();
    const { error } = await supabase.auth.signOut();

    if (error) {
      toast.error(error.message);
      return;
    }

    router.push("/login");
    router.refresh();
  }

  return (
    <div className="portal-app-shell portal-shell flex min-h-0 h-dvh overflow-hidden">
      <aside className="hidden h-dvh w-64 shrink-0 flex-col border-r border-border bg-navy-900/50 md:flex">
        <div className="flex items-center gap-2 border-b border-border px-5 py-5">
          <Logo size="sm" />
          <span className="text-xs font-semibold uppercase tracking-wide text-amber-200/90">
            Site admin
          </span>
        </div>
        <nav className="flex flex-1 flex-col gap-1 px-3 py-4">
          {ADMIN_LINKS.map((item) => {
            const Icon = item.icon;
            const isActive =
              pathname === item.href ||
              (item.href !== "/app/admin" && pathname.startsWith(`${item.href}/`)) ||
              (item.href === "/app/admin" && pathname === "/app/admin");

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition",
                  isActive
                    ? "bg-primary/15 text-blue-200"
                    : "text-muted-foreground hover:bg-accent hover:text-foreground",
                )}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="border-t border-border p-4">
          <Link
            href="/app/dashboard"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground transition hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Company portal
          </Link>
          <Link
            href="/app/admin/account"
            className="mt-3 block truncate text-xs text-muted-foreground transition hover:text-foreground"
          >
            {session.profile.full_name ?? "Site admin"}
          </Link>
          <button
            type="button"
            onClick={() => void handleLogout()}
            className="mt-3 inline-flex items-center gap-2 text-sm text-destructive transition hover:text-destructive/80"
          >
            <LogOut className="h-4 w-4" />
            Log out
          </button>
        </div>
      </aside>

      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        <header className="flex items-center justify-between gap-3 border-b border-border bg-navy-900/50 px-4 py-4 md:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <Shield className="h-5 w-5 shrink-0 text-amber-300" />
            <div className="min-w-0">
              <p className="text-sm font-semibold text-white">
                PainterApps administration
              </p>
              <p className="text-xs text-muted-foreground">
                Manage companies, users, product catalog, and feature access
              </p>
            </div>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className="relative h-10 w-10 shrink-0 rounded-full p-0"
                aria-label="Account menu"
              >
                <Avatar className="h-9 w-9">
                  <AvatarImage
                    src={session.profile.avatar_url ?? undefined}
                    alt={session.profile.full_name ?? "Site admin"}
                  />
                  <AvatarFallback className="bg-navy-700 text-blue-200">
                    {getUserInitials(session.profile.full_name)}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 bg-card">
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium leading-none">
                    {session.profile.full_name ?? "Site admin"}
                  </p>
                  <p className="text-xs text-muted-foreground">Site administrator</p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href="/app/admin/account">
                  <User className="mr-2 h-4 w-4" />
                  Account
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/app/dashboard">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Company portal
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => void handleLogout()}
                className="text-destructive"
              >
                <LogOut className="mr-2 h-4 w-4" />
                Log out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </header>
        <main
          data-site-scroll-main
          className="site-scroll-main scroll-smooth"
        >
          <div className="page-enter mx-auto w-full min-w-0 max-w-7xl p-4 md:p-6 lg:p-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}