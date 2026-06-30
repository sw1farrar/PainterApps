"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";

const TABS = [
  {
    href: "/app/products/catalog",
    label: "Product Catalog",
  },
  {
    href: "/app/products/sell-sheets",
    label: "Sell Sheets",
  },
] as const;

export function ProductsWorkspaceNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Products workspace"
      className="flex flex-wrap gap-2 border-b border-border pb-4"
    >
      {TABS.map((tab) => {
        const isActive =
          pathname === tab.href || pathname.startsWith(`${tab.href}/`);

        return (
          <Link
            key={tab.href}
            href={tab.href}
            aria-current={isActive ? "page" : undefined}
            className={cn(
              "inline-flex min-h-10 items-center rounded-lg border px-4 py-2 text-sm font-medium transition-colors",
              isActive
                ? "border-primary/40 bg-primary/15 text-blue-200"
                : "border-border bg-card/40 text-muted-foreground hover:border-primary/25 hover:bg-accent hover:text-foreground",
            )}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}