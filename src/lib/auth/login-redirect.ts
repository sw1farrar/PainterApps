const FREE_TOOLS_PREFIX = "/free-tools";

export function isFreeToolsPath(path: string): boolean {
  return path === FREE_TOOLS_PREFIX || path.startsWith(`${FREE_TOOLS_PREFIX}/`);
}

export function sanitizeLoginRedirect(
  next: string | null | undefined,
): string | null {
  if (!next?.startsWith("/") || next.startsWith("//")) {
    return null;
  }

  return isFreeToolsPath(next) ? next : null;
}

export function resolvePostLoginRedirect(
  next: string | null | undefined,
): string {
  return sanitizeLoginRedirect(next) ?? "/app/onboarding";
}

export function buildLoginHref(returnTo?: string | null): string {
  const safe = sanitizeLoginRedirect(returnTo ?? null);
  return safe ? `/login?next=${encodeURIComponent(safe)}` : "/login";
}

export function buildSignupHref(returnTo?: string | null): string {
  const safe = sanitizeLoginRedirect(returnTo ?? null);
  return safe ? `/signup?next=${encodeURIComponent(safe)}` : "/signup";
}

export function buildVerifyEmailHref(
  email: string,
  returnTo?: string | null,
): string {
  const params = new URLSearchParams({ email });
  const safe = sanitizeLoginRedirect(returnTo ?? null);
  if (safe) params.set("next", safe);
  return `/verify-email?${params.toString()}`;
}