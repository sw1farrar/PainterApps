import type { Company, CompanyFeature, UserRole } from "@/types/database";
import type { NavItem } from "@/lib/auth/roles";

export const DEFAULT_COMPANY_FEATURES: CompanyFeature[] = [
  "free_tools_sell_sheets",
];

export const ALL_COMPANY_FEATURES: CompanyFeature[] = [
  "free_tools_sell_sheets",
  "quotes",
  "customers",
  "jobs",
  "team",
  "reports",
  "billing",
];

export type CompanyFeatureMeta = {
  id: CompanyFeature;
  label: string;
  description: string;
  routePrefixes: string[];
};

export const COMPANY_FEATURE_META: Record<CompanyFeature, CompanyFeatureMeta> = {
  free_tools_sell_sheets: {
    id: "free_tools_sell_sheets",
    label: "Products",
    description: "Sell sheets, product catalog, and free tools build-sell-sheet",
    routePrefixes: ["/free-tools", "/app/products", "/app/sell-sheets"],
  },
  customers: {
    id: "customers",
    label: "Customers",
    description: "Customer directory and CRM",
    routePrefixes: ["/app/customers"],
  },
  quotes: {
    id: "quotes",
    label: "Estimates",
    description: "Quote builder and proposals",
    routePrefixes: ["/app/quotes"],
  },
  jobs: {
    id: "jobs",
    label: "Jobs",
    description: "Job tracking and field photos",
    routePrefixes: ["/app/jobs"],
  },
  team: {
    id: "team",
    label: "Team",
    description: "Team invites and roles",
    routePrefixes: ["/app/team"],
  },
  reports: {
    id: "reports",
    label: "Reports",
    description: "Business reports",
    routePrefixes: ["/app/reports"],
  },
  billing: {
    id: "billing",
    label: "Billing",
    description: "Subscription and payments",
    routePrefixes: ["/app/billing"],
  },
};

export function companyEnabledFeatures(
  company: Pick<Company, "enabled_features"> | null | undefined,
): CompanyFeature[] {
  return company?.enabled_features?.length
    ? company.enabled_features
    : DEFAULT_COMPANY_FEATURES;
}

export function companyHasFeature(
  company: Pick<Company, "enabled_features"> | null | undefined,
  feature: CompanyFeature,
): boolean {
  return companyEnabledFeatures(company).includes(feature);
}

export function companyRequiresSubscription(
  features: CompanyFeature[],
): boolean {
  return features.some((feature) => feature !== "free_tools_sell_sheets");
}

export function companyHasExtendedPortal(features: CompanyFeature[]): boolean {
  return features.some((feature) => feature !== "free_tools_sell_sheets");
}

const COMPANY_REQUIRED_ROUTE_PREFIXES = [
  "/app/settings",
  "/app/billing",
  "/app/team",
  "/app/customers",
  "/app/quotes",
  "/app/jobs",
  "/app/reports",
];

export function portalRouteRequiresCompany(path: string): boolean {
  return COMPANY_REQUIRED_ROUTE_PREFIXES.some(
    (prefix) => path === prefix || path.startsWith(`${prefix}/`),
  );
}

export function featureForPath(path: string): CompanyFeature | null {
  for (const meta of ALL_COMPANY_FEATURES.map((id) => COMPANY_FEATURE_META[id])) {
    if (meta.routePrefixes.some((prefix) => path.startsWith(prefix))) {
      return meta.id;
    }
  }
  return null;
}

export function canAccessCompanyRoute({
  role,
  enabledFeatures,
  path,
  isSiteAdmin = false,
  hasCompany = true,
}: {
  role: UserRole;
  enabledFeatures: CompanyFeature[];
  path: string;
  isSiteAdmin?: boolean;
  hasCompany?: boolean;
}): boolean {
  if (isSiteAdmin && !hasCompany) {
    if (portalRouteRequiresCompany(path)) {
      return false;
    }
    return true;
  }

  if (
    (path === "/app/dashboard" || path.startsWith("/app/dashboard/")) &&
    !companyHasExtendedPortal(enabledFeatures)
  ) {
    return false;
  }

  const requiredFeature = featureForPath(path);
  if (requiredFeature && !enabledFeatures.includes(requiredFeature)) {
    return false;
  }

  return true;
}

export function filterNavByFeatures(
  navItems: NavItem[],
  enabledFeatures: CompanyFeature[],
): NavItem[] {
  const hasExtendedPortal = companyHasExtendedPortal(enabledFeatures);

  return navItems.filter((item) => {
    if (item.href === "/app/dashboard" && !hasExtendedPortal) {
      return false;
    }
    if (!item.requiredFeature) return true;
    return enabledFeatures.includes(item.requiredFeature);
  });
}

export function safePortalHome(enabledFeatures: CompanyFeature[]): string {
  if (enabledFeatures.includes("free_tools_sell_sheets")) {
    return "/app/products";
  }
  return "/app/dashboard";
}