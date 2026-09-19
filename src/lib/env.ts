export function supabaseEnabled() {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );
}

export function mapboxEnabled() {
  return Boolean(process.env.NEXT_PUBLIC_MAPBOX_TOKEN);
}

export function appUrl() {
  return process.env.NEXT_PUBLIC_APP_URL ?? "https://painterapps.com";
}
