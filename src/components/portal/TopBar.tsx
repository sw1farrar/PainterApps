"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  CreditCard,
  Loader2,
  LogOut,
  Menu,
  Settings,
  User,
  type LucideIcon,
} from "lucide-react";
import * as React from "react";
import { toast } from "sonner";

import Logo from "@/components/Logo";
import { NotificationsBell } from "@/components/portal/NotificationsBell";
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
import { createClient } from "@/lib/supabase/client";
import { getSupabaseEnvError } from "@/lib/supabase/env";
import { isAbsoluteHttpUrl } from "@/lib/utils";
import type { Company, Profile } from "@/types/database";

type TopBarProps = {
  profile: Profile;
  company: Company | null;
  onMenuClick?: () => void;
};

function getInitials(name: string | null | undefined): string {
  if (!name) return "PA";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

type SettingsNavItemProps = {
  href: string;
  icon: LucideIcon;
  label: string;
  isNavigating: boolean;
  onNavigate: (href: string) => void;
};

function SettingsNavItem({
  href,
  icon: Icon,
  label,
  isNavigating,
  onNavigate,
}: SettingsNavItemProps) {
  return (
    <DropdownMenuItem onClick={() => onNavigate(href)} disabled={isNavigating}>
      {isNavigating ? (
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
      ) : (
        <Icon className="mr-2 h-4 w-4" />
      )}
      {label}
    </DropdownMenuItem>
  );
}

export function TopBar({ profile, company, onMenuClick }: TopBarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = React.useTransition();
  const [pendingHref, setPendingHref] = React.useState<string | null>(null);

  React.useEffect(() => {
    setPendingHref(null);
  }, [pathname]);

  function handleSettingsNavigate(href: string) {
    if (pathname === href) return;

    setPendingHref(href);
    startTransition(() => {
      router.push(href);
    });
  }

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
    <header className="flex min-h-14 shrink-0 items-center justify-between gap-2 border-b border-border bg-navy-950/80 px-3 pt-[env(safe-area-inset-top,0px)] backdrop-blur-md sm:gap-3 sm:px-4 md:gap-4 md:px-6">
      <div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-3">
        <Button
          variant="ghost"
          size="icon"
          className="-ml-1 shrink-0 md:hidden"
          onClick={onMenuClick}
          aria-label="Open navigation menu"
        >
          <Menu className="h-5 w-5" />
        </Button>

        <div className="flex min-w-0 items-center gap-2 sm:gap-3 md:hidden">
          {isAbsoluteHttpUrl(company?.logo_url) ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={company!.logo_url!}
              alt={company?.name ?? "Company logo"}
              className="h-7 w-7 shrink-0 rounded-md object-cover sm:h-8 sm:w-8"
            />
          ) : (
            <Logo variant="icon" size="sm" />
          )}
          <span className="truncate text-sm font-semibold text-foreground">
            {company?.name ?? "PainterApps"}
          </span>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-0.5 sm:gap-1">
        <NotificationsBell />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              className="relative h-10 w-10 rounded-full p-0"
            >
              <Avatar className="h-9 w-9">
                <AvatarImage
                  src={profile.avatar_url ?? undefined}
                  alt={profile.full_name ?? "User"}
                />
                <AvatarFallback className="bg-navy-700 text-blue-200">
                  {getInitials(profile.full_name)}
                </AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56 bg-card">
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium leading-none">
                  {profile.full_name ?? "Account"}
                </p>
                <p className="text-xs capitalize text-muted-foreground">
                  {profile.role.replace(/_/g, " ")}
                </p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <SettingsNavItem
              href="/app/profile"
              icon={User}
              label="Profile settings"
              isNavigating={isPending && pendingHref === "/app/profile"}
              onNavigate={handleSettingsNavigate}
            />
            {profile.role === "admin" ? (
              <>
                <SettingsNavItem
                  href="/app/settings"
                  icon={Settings}
                  label="Company settings"
                  isNavigating={isPending && pendingHref === "/app/settings"}
                  onNavigate={handleSettingsNavigate}
                />
                <DropdownMenuItem asChild>
                  <Link href="/app/billing">
                    <CreditCard className="mr-2 h-4 w-4" />
                    Billing
                  </Link>
                </DropdownMenuItem>
              </>
            ) : null}
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout} className="text-destructive">
              <LogOut className="mr-2 h-4 w-4" />
              Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}