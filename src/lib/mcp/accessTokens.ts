import { createHash, randomBytes, timingSafeEqual } from "crypto";
import { supabaseAdmin } from "@/lib/supabase/server";

export const MCP_ACCESS_TOKEN_PREFIX = "pa_mcp_";
export const MCP_ACCESS_TOKEN_MAX_PER_USER = 5;

export type McpAccessTokenSummary = {
  id: string;
  name: string;
  tokenPrefix: string;
  createdAt: string;
  lastUsedAt: string | null;
};

export class McpAccessTokenError extends Error {
  constructor(
    message: string,
    readonly code:
      | "not_configured"
      | "table_missing"
      | "limit_reached"
      | "not_found"
      | "invalid_name" = "not_found",
  ) {
    super(message);
    this.name = "McpAccessTokenError";
  }
}

export function isMcpAccessToken(token: string): boolean {
  return token.startsWith(MCP_ACCESS_TOKEN_PREFIX) && !token.includes(".");
}

function hashMcpAccessToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

function hashesMatch(storedHex: string, candidateHex: string): boolean {
  const stored = Buffer.from(storedHex, "hex");
  const candidate = Buffer.from(candidateHex, "hex");
  if (stored.length !== candidate.length || stored.length === 0) return false;
  return timingSafeEqual(stored, candidate);
}

function isSchemaMissing(error: unknown): boolean {
  const e = error as { code?: string; message?: string };
  const message = typeof e?.message === "string" ? e.message : "";
  return (
    e?.code === "PGRST205" ||
    e?.code === "42P01" ||
    message.includes("Could not find the table")
  );
}

function admin() {
  const db = supabaseAdmin();
  if (!db) {
    throw new McpAccessTokenError(
      "MCP tokens are not available.",
      "not_configured",
    );
  }
  return db;
}

function normalizeName(name: string | undefined): string {
  const trimmed = name?.trim() || "Grok bot";
  if (trimmed.length > 80) {
    throw new McpAccessTokenError("Name is too long.", "invalid_name");
  }
  return trimmed;
}

export async function listMcpAccessTokens(
  userId: string,
): Promise<McpAccessTokenSummary[]> {
  const supabase = admin();
  const { data, error } = await supabase
    .from("mcp_access_tokens")
    .select("id, name, token_prefix, created_at, last_used_at")
    .eq("user_id", userId)
    .is("revoked_at", null)
    .order("created_at", { ascending: false });
  if (error) {
    if (isSchemaMissing(error)) {
      throw new McpAccessTokenError("MCP token table is missing.", "table_missing");
    }
    throw new McpAccessTokenError("Could not list tokens.");
  }
  return (data ?? []).map((row) => ({
    id: row.id,
    name: row.name,
    tokenPrefix: row.token_prefix,
    createdAt: row.created_at,
    lastUsedAt: row.last_used_at,
  }));
}

export async function createMcpAccessToken(
  userId: string,
  name?: string,
): Promise<{ token: string; summary: McpAccessTokenSummary }> {
  const supabase = admin();
  const existing = await listMcpAccessTokens(userId);
  if (existing.length >= MCP_ACCESS_TOKEN_MAX_PER_USER) {
    throw new McpAccessTokenError(
      `You can have at most ${MCP_ACCESS_TOKEN_MAX_PER_USER} active tokens.`,
      "limit_reached",
    );
  }
  const secret = randomBytes(32).toString("base64url");
  const token = `${MCP_ACCESS_TOKEN_PREFIX}${secret}`;
  const { data, error } = await supabase
    .from("mcp_access_tokens")
    .insert({
      user_id: userId,
      name: normalizeName(name),
      token_hash: hashMcpAccessToken(token),
      token_prefix: `${token.slice(0, 12)}…`,
    })
    .select("id, name, token_prefix, created_at, last_used_at")
    .single();
  if (error || !data) {
    if (isSchemaMissing(error)) {
      throw new McpAccessTokenError("MCP token table is missing.", "table_missing");
    }
    throw new McpAccessTokenError("Could not create token.");
  }
  return {
    token,
    summary: {
      id: data.id,
      name: data.name,
      tokenPrefix: data.token_prefix,
      createdAt: data.created_at,
      lastUsedAt: data.last_used_at,
    },
  };
}

export async function revokeMcpAccessToken(userId: string, tokenId: string) {
  const supabase = admin();
  const { data, error } = await supabase
    .from("mcp_access_tokens")
    .update({ revoked_at: new Date().toISOString() })
    .eq("id", tokenId)
    .eq("user_id", userId)
    .is("revoked_at", null)
    .select("id")
    .maybeSingle();
  if (error) {
    throw new McpAccessTokenError("Could not revoke token.");
  }
  if (!data) throw new McpAccessTokenError("Token not found.", "not_found");
}

export async function resolveMcpAccessToken(token: string): Promise<string | null> {
  if (!isMcpAccessToken(token)) return null;
  const supabase = supabaseAdmin();
  if (!supabase) return null;
  const tokenHash = hashMcpAccessToken(token);
  const { data, error } = await supabase
    .from("mcp_access_tokens")
    .select("id, user_id, token_hash, revoked_at")
    .eq("token_hash", tokenHash)
    .maybeSingle();
  if (error || !data || data.revoked_at) return null;
  if (!hashesMatch(data.token_hash, tokenHash)) return null;
  void supabase
    .from("mcp_access_tokens")
    .update({ last_used_at: new Date().toISOString() })
    .eq("id", data.id);
  return data.user_id;
}
