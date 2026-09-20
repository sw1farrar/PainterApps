import { NextRequest, NextResponse } from "next/server";
import {
  isMcpAccessToken,
  resolveMcpAccessToken,
} from "@/lib/mcp/accessTokens";
import { getWhoami } from "@/lib/mcp/data";
import {
  MCP_CORS_HEADERS,
  jsonWithCors,
  mcpOptionsResponse,
  mcpUnauthorized,
  readBearerToken,
} from "@/lib/mcp/http";
import { handleMcpPayload } from "@/lib/mcp/protocol";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

function mcpResponse(body: unknown, sessionId: string | null) {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (sessionId) headers["Mcp-Session-Id"] = sessionId;
  return jsonWithCors(body, { headers });
}

async function requireMcpUser(request: NextRequest) {
  const token = readBearerToken(request);
  if (!token) return { error: mcpUnauthorized() };
  if (!isMcpAccessToken(token)) return { error: mcpUnauthorized() };
  const userId = await resolveMcpAccessToken(token);
  if (!userId) return { error: mcpUnauthorized() };
  try {
    await getWhoami(userId);
  } catch {
    return { error: mcpUnauthorized() };
  }
  return { userId };
}

export async function OPTIONS() {
  return mcpOptionsResponse();
}

export async function GET(request: NextRequest) {
  const auth = await requireMcpUser(request);
  if ("error" in auth && auth.error) return auth.error;
  return jsonWithCors({ error: "method_not_allowed" }, { status: 405 });
}

export async function DELETE(request: NextRequest) {
  const auth = await requireMcpUser(request);
  if ("error" in auth && auth.error) return auth.error;
  return new NextResponse(null, { status: 204, headers: MCP_CORS_HEADERS });
}

export async function POST(request: NextRequest) {
  const auth = await requireMcpUser(request);
  if ("error" in auth && auth.error) return auth.error;

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return jsonWithCors(
      { jsonrpc: "2.0", id: null, error: { code: -32700, message: "Parse error" } },
      { status: 400 },
    );
  }

  const result = await handleMcpPayload(payload, auth.userId!);
  const sessionId = request.headers.get("mcp-session-id");
  if (result === null) {
    return new NextResponse(null, { status: 202, headers: MCP_CORS_HEADERS });
  }
  return mcpResponse(result, sessionId);
}
