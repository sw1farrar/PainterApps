/** Shared PaintDay forecast cache lifetime. */
export const WEATHER_REVALIDATE_SECONDS = 900;

/** 15-minute bucket so stale `unstable_cache` entries cannot be served. */
export function weatherCacheBucket(now = Date.now()) {
  return Math.floor(now / (WEATHER_REVALIDATE_SECONDS * 1000));
}
