import type { NewsPost } from "@/lib/news/types";

/**
 * Optional file-based posts. Public /news is DB-only unless you add entries here.
 * A database row with the same slug replaces the file post.
 */
export const SEED_NEWS: NewsPost[] = [];
