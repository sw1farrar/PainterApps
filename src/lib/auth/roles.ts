import type { CompanyFeature, UserRole } from "@/types/database";
import {
  canAccessCompanyRoute,
  companyEnabledFeatures,
  filterNavByFeatures,
} from "@/lib/auth/company-features";
import type { Company } from "@/types/database";

export type NavItem = {
  href: string;
  label: string;
  icon: string;
  roles: UserRole[];
  requiredFeature?: CompanyFeature;
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
    requiredFeature: "customers",
  },
  {
    href: "/app/quotes",
    label: "Quotes",
    icon: "file-text",
    roles: ["admin", "project_manager"],
    requiredFeature: "quotes",
  },
  {
    href: "/app/sell-sheets",
    label: "Sell sheets",
    icon: "file-stack",
    roles: ["admin", "project_manager"],
    requiredFeature: "free_tools_sell_sheets",
  },
  {
    href: "/app/jobs",
    label: "Jobs",
    icon: "hard-hat",
    roles: ["admin", "project_manager", "job_superintendent", "painter"],
    requiredFeature: "jobs",
  },
  {
    href: "/app/team",
    label: "Team",
    icon: "user-plus",
    roles: ["admin"],
    requiredFeature: "team",
  },
  {
    href: "/app/reports",
    label: "Reports",
    icon: "bar-chart",
    roles: ["admin", "finance"],
    requiredFeature: "reports",
  },
  {
    href: "/free-tools",
    label: "Free tools",
    icon: "sparkles",
    roles: [
      "admin",
      "project_manager",
      "finance",
      "job_superintendent",
      "painter",
    ],
    requiredFeature: "free_tools_sell_sheets",
  },
];

export const SITE_ADMIN_NAV_ITEMS: NavItem[] = [
  {
    href: "/app/admin",
    label: "Overview",
    icon: "layout-dashboard",
    roles: ["admin", "project_manager", "finance", "job_superintendent", "painter"],
  },
  {
    href: "/app/admin/companies",
    label: "Companies",
    icon: "users",
    roles: ["admin", "project_manager", "finance", "job_superintendent", "painter"],
  },
  {
    href: "/app/admin/users",
    label: "Users",
    icon: "user-plus",
    roles: ["admin", "project_manager", "finance", "job_superintendent", "painter"],
  },
];

export function filterNavByRole(role: UserRole): NavItem[] {
  return NAV_ITEMS.filter((item) => item.roles.includes(role));
}

export function filterNavByRoleAndFeatures(
  role: UserRole,
  company: Pick<Company, "enabled_features"> | null | undefined,
): NavItem[] {
  const enabledFeatures = companyEnabledFeatures(company);
  return filterNavByFeatures(filterNavByRole(role), enabledFeatures);
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

export function canAccessWithFeatures({
  role,
  company,
  path,
  isSiteAdmin = false,
}: {
  role: UserRole;
  company: Pick<Company, "enabled_features" | "id"> | null | undefined;
  path: string;
  isSiteAdmin?: boolean;
}): boolean {
  if (!canAccess(role, path)) return false;

  const enabledFeatures = companyEnabledFeatures(company);
  return canAccessCompanyRoute({
    role,
    enabledFeatures,
    path,
    isSiteAdmin,
    hasCompany: Boolean(company?.id),
  });
}