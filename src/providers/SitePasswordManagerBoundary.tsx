"use client";

import { usePathname } from "next/navigation";

import { isPasswordManagerAllowedPath } from "@/lib/forms/password-manager";
import { PasswordManagerProvider } from "@/providers/PasswordManagerProvider";

export function SitePasswordManagerBoundary({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname() ?? "";
  const suppress = !isPasswordManagerAllowedPath(pathname);

  return (
    <PasswordManagerProvider suppress={suppress}>{children}</PasswordManagerProvider>
  );
}