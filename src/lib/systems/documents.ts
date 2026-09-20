import { isNewsEditor } from "@/lib/news/editors";
import { McpToolError } from "@/lib/mcp/data";
import { supabaseAdmin } from "@/lib/supabase/server";
import { documentPublicUrl } from "@/lib/systems/document-url";

export { documentPublicUrl };

export type TdsDocument = {
  id: string;
  productId: string;
  kind: "pds" | "sds" | "eds" | "other";
  title: string;
  url: string;
  revision: string;
  publishedAt: string | null;
  fileName: string | null;
  mimeType: string | null;
  byteSize: number | null;
  storagePath: string | null;
  rawText: string | null;
  publicUrl: string | null;
  stored: boolean;
};

function admin() {
  const db = supabaseAdmin();
  if (!db) throw new McpToolError("PainterApps is not connected to live data.");
  return db;
}

async function requireEditor(userId: string) {
  if (!(await isNewsEditor(userId))) {
    throw new McpToolError("Only PainterApps editors can change data sheets.");
  }
}

function fromRow(row: Record<string, unknown>): TdsDocument {
  const storagePath = row.storage_path ? String(row.storage_path) : null;
  const url = String(row.url ?? "");
  return {
    id: String(row.id),
    productId: String(row.product_id ?? ""),
    kind: (row.kind as TdsDocument["kind"]) || "pds",
    title: String(row.title ?? "Product data sheet"),
    url,
    revision: String(row.revision ?? ""),
    publishedAt: row.published_at ? String(row.published_at) : null,
    fileName: row.file_name ? String(row.file_name) : null,
    mimeType: row.mime_type ? String(row.mime_type) : null,
    byteSize: row.byte_size != null ? Number(row.byte_size) : null,
    storagePath,
    rawText: row.raw_text ? String(row.raw_text) : null,
    publicUrl: documentPublicUrl(storagePath, url),
    stored: Boolean(storagePath),
  };
}

export async function listDocuments(productId?: string) {
  let q = admin()
    .from("tds_documents")
    .select(
      "id,product_id,kind,title,url,revision,published_at,file_name,mime_type,byte_size,storage_path,updated_at",
    )
    .order("updated_at", { ascending: false })
    .limit(100);
  if (productId) q = q.eq("product_id", productId);
  const { data, error } = await q;
  if (error) throw new McpToolError(error.message);
  return (data ?? []).map((r) => fromRow(r as Record<string, unknown>));
}

export async function getDocument(id: string) {
  const { data, error } = await admin()
    .from("tds_documents")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new McpToolError(error.message);
  if (!data) throw new McpToolError("Data sheet not found.");
  return fromRow(data as Record<string, unknown>);
}

function asPdfBytes(bytes: Uint8Array) {
  if (bytes.byteLength < 8 || bytes.byteLength > 20_000_000) {
    throw new McpToolError("PDF must be between 8 bytes and 20 MB.");
  }
  if (
    bytes[0] !== 0x25 ||
    bytes[1] !== 0x50 ||
    bytes[2] !== 0x44 ||
    bytes[3] !== 0x46
  ) {
    throw new McpToolError("File is not a PDF.");
  }
  return bytes;
}

async function storePdf(productId: string, bytes: Uint8Array, fileName: string) {
  const db = admin();
  const pdf = asPdfBytes(bytes);
  const safeName = fileName.toLowerCase().endsWith(".pdf")
    ? fileName
    : `${fileName}.pdf`;
  const path = `${productId}/${crypto.randomUUID()}.pdf`;
  const { error } = await db.storage.from("tds-pdfs").upload(path, pdf, {
    contentType: "application/pdf",
    upsert: false,
  });
  if (error) throw new McpToolError(error.message);
  return {
    storagePath: path,
    fileName: safeName,
    mimeType: "application/pdf",
    byteSize: pdf.byteLength,
  };
}

async function maybeFetchPdf(url: string, productId: string) {
  if (!/^https?:\/\//i.test(url)) return null;
  try {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) return null;
    const type = res.headers.get("content-type") ?? "";
    if (!type.includes("pdf") && !url.toLowerCase().endsWith(".pdf")) return null;
    const buf = new Uint8Array(await res.arrayBuffer());
    if (buf.byteLength < 8 || buf.byteLength > 20_000_000) return null;
    const name =
      url.split("/").pop()?.split("?")[0] || `${productId}.pdf`;
    return storePdf(productId, buf, name);
  } catch {
    return null;
  }
}

export async function upsertDocument(
  userId: string,
  args: Record<string, unknown>,
) {
  await requireEditor(userId);
  const productId = String(args.product_id ?? "").trim();
  if (!productId) throw new McpToolError("product_id is required.");
  const { data: product } = await admin()
    .from("tds_products")
    .select("id,name")
    .eq("id", productId)
    .maybeSingle();
  if (!product) throw new McpToolError("Unknown product_id.");

  const url = String(args.url ?? args.source_url ?? "").trim();
  const kind = String(args.kind ?? "pds");
  if (!["pds", "sds", "eds", "other"].includes(kind)) {
    throw new McpToolError("kind must be pds, sds, eds, or other.");
  }

  let existing: TdsDocument | null = null;
  if (args.id) {
    try {
      existing = await getDocument(String(args.id));
    } catch {
      existing = null;
    }
  }
  if (!existing) {
    const siblings = await listDocuments(productId);
    const match = siblings.find((d) => d.kind === kind);
    if (match) existing = await getDocument(match.id);
  }
  const id = existing?.id ?? (args.id ? String(args.id) : crypto.randomUUID());

  let stored: {
    storagePath: string;
    fileName: string;
    mimeType: string;
    byteSize: number;
  } | null = null;
  const b64 = typeof args.pdf_base64 === "string" ? args.pdf_base64 : "";
  if (b64) {
    const bytes = Uint8Array.from(
      Buffer.from(b64.replace(/^data:.*?;base64,/, ""), "base64"),
    );
    stored = await storePdf(
      productId,
      bytes,
      String(args.file_name ?? existing?.fileName ?? `${productId}.pdf`),
    );
  } else if (url && args.fetch_pdf !== false && !existing?.storagePath) {
    stored = await maybeFetchPdf(url, productId);
  }

  if (stored && existing?.storagePath && existing.storagePath !== stored.storagePath) {
    await admin().storage.from("tds-pdfs").remove([existing.storagePath]);
  }

  const payload: Record<string, unknown> = {
    id,
    product_id: productId,
    kind,
    title: String(args.title ?? existing?.title ?? product.name ?? "Product data sheet"),
    url: url || existing?.url || "",
    revision:
      args.revision != null ? String(args.revision) : (existing?.revision ?? ""),
    published_at: args.published_at
      ? String(args.published_at)
      : existing?.publishedAt,
    file_name:
      stored?.fileName ??
      (args.file_name ? String(args.file_name) : existing?.fileName ?? null),
    mime_type: stored?.mimeType ?? existing?.mimeType ?? "application/pdf",
    byte_size: stored?.byteSize ?? existing?.byteSize ?? null,
    storage_path: stored?.storagePath ?? existing?.storagePath ?? null,
    updated_at: new Date().toISOString(),
  };
  if (args.raw_text != null) payload.raw_text = String(args.raw_text);
  else if (!existing) payload.raw_text = null;

  const { data, error } = await admin()
    .from("tds_documents")
    .upsert(payload)
    .select("*")
    .single();
  if (error) throw new McpToolError(error.message);
  return fromRow(data as Record<string, unknown>);
}

export async function deleteDocument(userId: string, id: string) {
  await requireEditor(userId);
  const doc = await getDocument(id);
  if (doc.storagePath) {
    await admin().storage.from("tds-pdfs").remove([doc.storagePath]);
  }
  const { error } = await admin().from("tds_documents").delete().eq("id", id);
  if (error) throw new McpToolError(error.message);
  return { deleted: id };
}
