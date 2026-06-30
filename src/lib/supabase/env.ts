export function getSupabaseEnvError(): string | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    return "Database connection is not configured.";
  }

  return null;
}

export function isSupabaseConfigured(): boolean {
  return getSupabaseEnvError() === null;
}