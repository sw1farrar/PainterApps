export function getMcpIssuer(): string {
  const explicit =
    process.env.MCP_RESOURCE_URL?.trim() ||
    process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (explicit) {
    return explicit.replace(/\/$/, "").replace(/\/api\/mcp$/i, "");
  }
  const productionHost = process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim();
  if (process.env.VERCEL_ENV === "production" && productionHost) {
    return `https://${productionHost.replace(/\/$/, "")}`;
  }
  const vercelUrl = process.env.VERCEL_URL?.trim();
  if (vercelUrl) return `https://${vercelUrl.replace(/\/$/, "")}`;
  return "http://localhost:3000";
}

export function getMcpResourceUrl(): string {
  return `${getMcpIssuer()}/api/mcp`;
}

export const MCP_SERVER_NAME = "painterapps";
export const MCP_SERVER_VERSION = "0.4.0";
export const MCP_RESOURCE_NAME = "PainterApps";
