import { jsonWithCors, mcpOptionsResponse } from "@/lib/mcp/http";
import { getMcpIssuer, getMcpResourceUrl, MCP_RESOURCE_NAME } from "@/lib/mcp/config";

export const dynamic = "force-dynamic";

export async function OPTIONS() {
  return mcpOptionsResponse();
}

export async function GET() {
  const issuer = getMcpIssuer();
  return jsonWithCors({
    resource: getMcpResourceUrl(),
    resource_name: MCP_RESOURCE_NAME,
    authorization_servers: [issuer],
    bearer_methods_supported: ["header"],
    scopes_supported: ["mcp:tools", "mcp:read", "mcp:write"],
  });
}
