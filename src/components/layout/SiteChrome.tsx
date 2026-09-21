"use client";

import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";

export function SiteChrome({
  header,
  footer,
  children,
}: {
  header: React.ReactNode;
  footer: React.ReactNode;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const t = useTranslations("nav");
  if (pathname.startsWith("/e/")) {
    return <>{children}</>;
  }
  const inApp = pathname === "/app" || pathname.startsWith("/app/");
  return (
    <div className="flex min-h-dvh w-full min-w-0 max-w-full flex-col">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-3 focus:z-50 focus:rounded-md focus:bg-background focus:px-3 focus:py-2 focus:text-sm"
      >
        {t("skip")}
      </a>
      {header}
      <main id="main" className="flex min-h-0 min-w-0 flex-1 flex-col">
        {children}
      </main>
      {inApp ? null : footer}
    </div>
  );
}
