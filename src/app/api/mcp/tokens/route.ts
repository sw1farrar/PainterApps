import { NextRequest, NextResponse } from "next/server";
import { currentUserId } from "@/lib/auth/current-user";
import {
  McpAccessTokenError,
  createMcpAccessToken,
  listMcpAccessTokens,
} from "@/lib/mcp/accessTokens";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function tokenError(err: unknown) {
  if (err instanceof McpAccessTokenError) {
    const status =
      err.code === "limit_reached" || err.code === "invalid_name"
        ? 400
        : err.code === "table_missing" || err.code === "not_configured"
          ? 503
          : 400;
    return NextResponse.json({ error: err.message, code: err.code }, { status });
  }
  return NextResponse.json({ error: "Token request failed." }, { status: 500 });
}

export async function GET() {
  const userId = await currentUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const tokens = await listMcpAccessTokens(userId);
    return NextResponse.json({ ok: true, tokens });
  } catch (err) {
    return tokenError(err);
  }
}

export async function POST(request: NextRequest) {
  const userId = await currentUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  let name: string | undefined;
  try {
    const body = (await request.json()) as { name?: string };
    name = body.name;
  } catch {
    name = undefined;
  }
  try {
    const created = await createMcpAccessToken(userId, name);
    return NextResponse.json({
      ok: true,
      token: created.token,
      summary: created.summary,
    });
  } catch (err) {
    return tokenError(err);
  }
}
