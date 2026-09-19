export function safeNextPath(
  value: string | null | undefined,
  fallback = "/app",
) {
  if (!value) return fallback;
  if (!value.startsWith("/") || value.startsWith("//")) return fallback;
  if (value.startsWith("/login") || value.startsWith("/sign-up")) {
    return fallback;
  }
  return value;
}
