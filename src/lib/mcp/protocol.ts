import { MCP_SERVER_NAME, MCP_SERVER_VERSION } from "@/lib/mcp/config";
import { callMcpTool, listMcpToolDescriptors } from "@/lib/mcp/tools";

const SUPPORTED_PROTOCOL_VERSIONS = ["2025-06-18", "2025-03-26", "2024-11-05"];

type JsonRpcId = string | number | null;
type JsonRpcRequest = {
  jsonrpc?: string;
  id?: JsonRpcId;
  method?: string;
  params?: unknown;
};
type JsonRpcResponse = {
  jsonrpc: "2.0";
  id: JsonRpcId;
  result?: unknown;
  error?: { code: number; message: string; data?: unknown };
};

function isObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function textResult(text: string, isError = false) {
  return {
    content: [{ type: "text", text }],
    ...(isError ? { isError: true } : {}),
  };
}

function jsonResult(value: unknown, isError = false) {
  return textResult(JSON.stringify(value, null, 2), isError);
}

function isNotification(message: JsonRpcRequest) {
  return message.id === undefined;
}

export async function handleMcpMessage(
  message: JsonRpcRequest,
  userId: string | null,
): Promise<JsonRpcResponse | null> {
  const id = (message.id ?? null) as JsonRpcId;
  const method = typeof message.method === "string" ? message.method : "";
  if (message.jsonrpc !== "2.0" || !method) {
    if (isNotification(message)) return null;
    return { jsonrpc: "2.0", id, error: { code: -32600, message: "Invalid Request" } };
  }
  if (isNotification(message)) return null;

  try {
    if (method === "initialize") {
      const params = isObject(message.params) ? message.params : {};
      const requested =
        typeof params.protocolVersion === "string"
          ? params.protocolVersion
          : "2025-03-26";
      const protocolVersion = SUPPORTED_PROTOCOL_VERSIONS.includes(requested)
        ? requested
        : "2025-03-26";
      return {
        jsonrpc: "2.0",
        id,
        result: {
          protocolVersion,
          capabilities: { tools: { listChanged: true } },
          serverInfo: { name: MCP_SERVER_NAME, version: MCP_SERVER_VERSION },
          instructions:
            "You are connected to the signed-in user's PainterApps company. Use get_paintday for weather. Use list_manufacturers, list_products, get_product, and update_product for the live TDS catalog (editors / platform_admin on write). On each product set description (what it does), features[], and benefits[] for the Systems envelope, plus typed TDS columns. Odd keys go in attrs. Do not invent product numbers. official_tds_pdf_url or a stored PDF powers the full-size PDF preview. Systems page filters are interior/exterior, application_types, substrates, sheen, VOC, manufacturer. Call list_application_types then update_system with only { id, application_types } to tag uses. Use list_tds_documents / create_tds_document for PDF sheets (raw_text for extracted TDS). Use suggest_systems with a ZIP so recommendations follow today's conditions.",
        },
      };
    }
    if (method === "ping") return { jsonrpc: "2.0", id, result: {} };
    if (method === "tools/list") {
      return { jsonrpc: "2.0", id, result: { tools: listMcpToolDescriptors() } };
    }
    if (method === "tools/call") {
      const params = isObject(message.params) ? message.params : {};
      const name = typeof params.name === "string" ? params.name : "";
      const args = isObject(params.arguments) ? params.arguments : {};
      if (!name) {
        return { jsonrpc: "2.0", id, result: textResult("Tool name is required.", true) };
      }
      if (!userId) {
        return {
          jsonrpc: "2.0",
          id,
          result: textResult(
            "Authentication required. Send Authorization: Bearer pa_mcp_… from PainterApps → Settings → Grok bot.",
            true,
          ),
        };
      }
      const outcome = await callMcpTool(userId, name, args);
      if (!outcome.ok) {
        return { jsonrpc: "2.0", id, result: textResult(outcome.error, true) };
      }
      return { jsonrpc: "2.0", id, result: jsonResult(outcome.result) };
    }
    if (method === "resources/list") {
      return { jsonrpc: "2.0", id, result: { resources: [] } };
    }
    if (method === "prompts/list") {
      return { jsonrpc: "2.0", id, result: { prompts: [] } };
    }
    return {
      jsonrpc: "2.0",
      id,
      error: { code: -32601, message: `Method not found: ${method}` },
    };
  } catch (error) {
    return {
      jsonrpc: "2.0",
      id,
      error: {
        code: -32603,
        message: error instanceof Error ? error.message : "Internal error",
      },
    };
  }
}

export async function handleMcpPayload(
  payload: unknown,
  userId: string | null,
): Promise<JsonRpcResponse | JsonRpcResponse[] | null> {
  if (Array.isArray(payload)) {
    const responses: JsonRpcResponse[] = [];
    for (const item of payload) {
      const response = await handleMcpMessage(item as JsonRpcRequest, userId);
      if (response) responses.push(response);
    }
    return responses.length ? responses : null;
  }
  return handleMcpMessage(payload as JsonRpcRequest, userId);
}
