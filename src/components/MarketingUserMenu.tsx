"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  CreditCard,
  LayoutDashboard,
  Loader2,
  LogOut,
  Settings,
  User,
  type LucideIcon,
} from "lucide-react";
import * as React from "react";
import { toast } from "sonner";

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
import type { MarketingUser } from "@/lib/auth/marketing-actions";
import { createClient } from "@/lib/supabase/client";
import { getSupabaseEnvError } from "@/lib/supabase/env";

type MarketingUserMenuProps = {
  user: MarketingUser;
};

type NavItemProps = {
  href: string;
  icon: LucideIcon;
  label: string;
  isNavigating: boolean;
  onNavigate: (href: string) => void;
};

function NavItem({
  href,
  icon: Icon,
  label,
  isNavigating,
  onNavigate,
}: NavItemProps) {
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

export function MarketingUserMenu({ user }: MarketingUserMenuProps) {
  const router = useRouter();
  const [isPending, startTransition] = React.useTransition();
  const [pendingHref, setPendingHref] = React.useState<string | null>(null);

  function handleNavigate(href: string) {
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

    router.refresh();
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className="relative h-10 w-10 rounded-full border border-silver-400/20 p-0 hover:bg-navy-900/60"
          aria-label="Account menu"
        >
          <Avatar className="h-9 w-9">
            <AvatarImage
              src={user.avatarUrl ?? undefined}
              alt={user.fullName ?? "User"}
            />
            <AvatarFallback className="bg-navy-700 text-blue-200">
              {getUserInitials(user.fullName)}
            </AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56 bg-card">
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">
              {user.fullName ?? "Account"}
            </p>
            <p className="text-xs capitalize text-muted-foreground">
              {user.role.replace(/_/g, " ")}
            </p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <NavItem
          href="/app/dashboard"
          icon={LayoutDashboard}
          label="Dashboard"
          isNavigating={isPending && pendingHref === "/app/dashboard"}
          onNavigate={handleNavigate}
        />
        <NavItem
          href="/app/profile"
          icon={User}
          label="Profile settings"
          isNavigating={isPending && pendingHref === "/app/profile"}
          onNavigate={handleNavigate}
        />
        {user.role === "admin" ? (
          <>
            <NavItem
              href="/app/settings"
              icon={Settings}
              label="Company settings"
              isNavigating={isPending && pendingHref === "/app/settings"}
              onNavigate={handleNavigate}
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
  );
}