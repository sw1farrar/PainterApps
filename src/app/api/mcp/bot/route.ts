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
  readMcpAccessToken,
} from "@/lib/mcp/http";
import { handleMcpPayload } from "@/lib/mcp/protocol";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

async function optionalPatUser(request: NextRequest): Promise<string | null> {
  const token = readMcpAccessToken(request);
  if (!token || !isMcpAccessToken(token)) return null;
  const userId = await resolveMcpAccessToken(token);
  if (!userId) return null;
  try {
    await getWhoami(userId);
    return userId;
  } catch {
    return null;
  }
}

function mcpResponse(body: unknown, sessionId: string | null) {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (sessionId) headers["Mcp-Session-Id"] = sessionId;
  return jsonWithCors(body, { headers });
}

export async function OPTIONS() {
  return mcpOptionsResponse();
}

export async function GET() {
  return jsonWithCors({
    ok: true,
    name: "painterapps",
    transport: "streamable-http",
    auth: "bearer",
  });
}

export async function DELETE() {
  return new NextResponse(null, { status: 204, headers: MCP_CORS_HEADERS });
}

export async function POST(request: NextRequest) {
  const userId = await optionalPatUser(request);
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return jsonWithCors(
      { jsonrpc: "2.0", id: null, error: { code: -32700, message: "Parse error" } },
      { status: 400 },
    );
  }
  const result = await handleMcpPayload(payload, userId);
  const sessionId = request.headers.get("mcp-session-id");
  if (result === null) {
    return new NextResponse(null, { status: 202, headers: MCP_CORS_HEADERS });
  }
  return mcpResponse(result, sessionId);
}
