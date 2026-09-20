export function documentPublicUrl(
  storagePath: string | null,
  fallbackUrl: string,
) {
  if (!storagePath) return fallbackUrl || null;
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "");
  if (!base) return fallbackUrl || null;
  return `${base}/storage/v1/object/public/tds-pdfs/${storagePath}`;
}
