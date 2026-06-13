import type { UserRole } from "@/types/database";

export type NavItem = {
  href: string;
  label: string;
  icon: string;
  roles: UserRole[];
};

const PROTECTED_ROUTES: { prefix: string; roles: UserRole[] }[] = [
  { prefix: "/app/settings", roles: ["admin"] },
  { prefix: "/app/billing", roles: ["admin"] },
];

export const NAV_ITEMS: NavItem[] = [
  {
    href: "/app/dashboard",
    label: "Dashboard",
    icon: "layout-dashboard",
    roles: ["admin", "project_manager", "finance", "job_superintendent"],
  },
  {
    href: "/app/customers",
    label: "Customers",
    icon: "users",
    roles: ["admin", "project_manager"],
  },
  {
    href: "/app/quotes",
    label: "Quotes",
    icon: "file-text",
    roles: ["admin", "project_manager"],
  },
  {
    href: "/app/jobs",
    label: "Jobs",
    icon: "hard-hat",
    roles: ["admin", "project_manager", "job_superintendent", "painter"],
  },
  {
    href: "/app/team",
    label: "Team",
    icon: "user-plus",
    roles: ["admin"],
  },
  {
    href: "/app/reports",
    label: "Reports",
    icon: "bar-chart",
    roles: ["admin", "finance"],
  },
];

export function filterNavByRole(role: UserRole): NavItem[] {
  return NAV_ITEMS.filter((item) => item.roles.includes(role));
}

export function canAccess(role: UserRole, path: string): boolean {
  const protectedRoute = PROTECTED_ROUTES.find((route) =>
    path.startsWith(route.prefix),
  );
  if (protectedRoute) {
    return protectedRoute.roles.includes(role);
  }

  const item = NAV_ITEMS.find((nav) => path.startsWith(nav.href));
  if (!item) return true;
  return item.roles.includes(role);
}