export function safeNextPath(
  value: string | null | undefined,
  fallback = "/app",
) {
  if (!value) return fallback;
  let next = value.trim();
  try {
    if (/^https?:\/\//i.test(next)) {
      const url = new URL(next);
      if (url.origin !== "https://painterapps.com" && url.hostname !== "localhost") {
        return fallback;
      }
      next = `${url.pathname}${url.search}`;
    }
  } catch {
    return fallback;
  }
  next = next.replace(/\\/g, "");
  if (!next.startsWith("/") || next.startsWith("//")) return fallback;
  if (next.startsWith("/login") || next.startsWith("/sign-up")) {
    return fallback;
  }
  return next;
}
