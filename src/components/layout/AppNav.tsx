"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

export function AppNav({
  links,
}: {
  links: Array<{ href: string; label: string }>;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const current =
    links.find((l) =>
      l.href === "/app"
        ? pathname === "/app"
        : pathname === l.href || pathname.startsWith(`${l.href}/`),
    )?.href ?? links[0]?.href ?? "/app";

  return (
    <>
      <label className="sr-only" htmlFor="app-nav-select">
        Portal
      </label>
      <select
        id="app-nav-select"
        className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm md:hidden"
        value={current}
        onChange={(e) => router.push(e.target.value)}
      >
        {links.map((l) => (
          <option key={l.href} value={l.href}>
            {l.label}
          </option>
        ))}
      </select>
      <nav className="hidden gap-1 text-sm md:flex md:flex-col" aria-label="Portal">
        {links.map((l) => {
          const active =
            l.href === "/app"
              ? pathname === "/app"
              : pathname === l.href || pathname.startsWith(`${l.href}/`);
          return (
            <Link
              key={l.href}
              href={l.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "rounded-lg px-3 py-2",
                active
                  ? "bg-muted font-medium text-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              {l.label}
            </Link>
          );
        })}
      </nav>
    </>
  );
}
