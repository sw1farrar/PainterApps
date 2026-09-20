import { NextRequest, NextResponse } from "next/server";
import { currentUserId } from "@/lib/auth/current-user";
import {
  McpAccessTokenError,
  revokeMcpAccessToken,
} from "@/lib/mcp/accessTokens";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function DELETE(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const userId = await currentUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await context.params;
  if (!id) return NextResponse.json({ error: "Token id is required." }, { status: 400 });
  try {
    await revokeMcpAccessToken(userId, id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof McpAccessTokenError) {
      const status = err.code === "not_found" ? 404 : 400;
      return NextResponse.json({ error: err.message, code: err.code }, { status });
    }
    return NextResponse.json({ error: "Could not revoke token." }, { status: 500 });
  }
}
