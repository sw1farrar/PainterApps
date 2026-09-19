import { PRODUCTS } from "@/data/tds/corpus";
import type { TdsProduct } from "./types";

export type ChunkHit = {
  productId: string;
  content: string;
  score: number;
};

/**
 * RAG stub.
 *
 * Today: keyword overlap against product notes + names.
 * Tomorrow: query `tds_chunks` / `tds_embeddings` and rank by cosine similarity.
 *
 * Keep this module as the only retrieval entry point so swapping in
 * real embeddings does not touch the wizard UI.
 */
export function searchChunks(query: string, limit = 8): ChunkHit[] {
  const terms = query
    .toLowerCase()
    .split(/\s+/)
    .filter((t) => t.length > 2);
  if (!terms.length) return [];

  const scored = PRODUCTS.map((p) => {
    const hay = chunkText(p).toLowerCase();
    const score = terms.reduce(
      (sum, t) => sum + (hay.includes(t) ? 1 : 0),
      0,
    );
    return {
      productId: p.id,
      content: chunkText(p),
      score,
    };
  })
    .filter((h) => h.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);

  return scored;
}

function chunkText(p: TdsProduct) {
  return [
    p.name,
    p.sku,
    p.notes,
    p.kind,
    p.substrates.join(" "),
    p.tdsRevision,
  ].join(" ");
}
