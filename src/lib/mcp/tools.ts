import {
  createCustomer,
  deleteNewsById,
  getNewsPost,
  getPaintDay,
  getWhoami,
  listCustomers,
  listEstimates,
  listJobs,
  listNewsPosts,
  upsertNewsPost,
} from "@/lib/mcp/data";

type JsonSchema = {
  type: "object";
  properties: Record<string, Record<string, unknown>>;
  required?: string[];
  additionalProperties?: boolean;
};

type McpToolDefinition = {
  name: string;
  description: string;
  inputSchema: JsonSchema;
  handler: (userId: string, args: Record<string, unknown>) => Promise<unknown>;
};

function str(args: Record<string, unknown>, key: string) {
  const value = args[key];
  return typeof value === "string" ? value : undefined;
}

const MCP_TOOLS: McpToolDefinition[] = [
  {
    name: "whoami",
    description: "Show the PainterApps account Grok is acting as.",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
    handler: (userId) => getWhoami(userId),
  },
  {
    name: "get_paintday",
    description:
      "PaintDay score, current conditions, start/wrap window, and 7-day outlook for a US ZIP.",
    inputSchema: {
      type: "object",
      properties: {
        zip: { type: "string", description: "5-digit US ZIP, e.g. 94110." },
      },
      required: ["zip"],
      additionalProperties: false,
    },
    handler: (_userId, args) => getPaintDay(str(args, "zip") ?? ""),
  },
  {
    name: "list_jobs",
    description: "List the signed-in company's job files.",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
    handler: (userId) => listJobs(userId),
  },
  {
    name: "list_customers",
    description: "List customers for the signed-in company.",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
    handler: (userId) => listCustomers(userId),
  },
  {
    name: "create_customer",
    description: "Add a customer (homeowner) to the company.",
    inputSchema: {
      type: "object",
      properties: {
        name: { type: "string" },
        phone: { type: "string" },
        email: { type: "string" },
        zip: { type: "string" },
        address: { type: "string" },
      },
      required: ["name"],
      additionalProperties: false,
    },
    handler: (userId, args) =>
      createCustomer(userId, {
        name: str(args, "name") ?? "",
        phone: str(args, "phone"),
        email: str(args, "email"),
        zip: str(args, "zip"),
        address: str(args, "address"),
      }),
  },
  {
    name: "list_estimates",
    description: "List recent time-based estimates.",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
    handler: (userId) => listEstimates(userId),
  },
  {
    name: "list_news",
    description:
      "List PainterApps news. Editors may pass include_drafts true.",
    inputSchema: {
      type: "object",
      properties: {
        include_drafts: {
          type: "boolean",
          description: "Include unpublished posts (editors only).",
        },
      },
      additionalProperties: false,
    },
    handler: (userId, args) =>
      listNewsPosts(userId, Boolean(args.include_drafts)),
  },
  {
    name: "get_news",
    description: "Get one news post by slug or id.",
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "string", description: "Post id or slug." },
      },
      required: ["id"],
      additionalProperties: false,
    },
    handler: (_userId, args) => getNewsPost(str(args, "id") ?? ""),
  },
  {
    name: "create_news",
    description:
      "Create or upsert a news post (editors only). English title and body required.",
    inputSchema: {
      type: "object",
      properties: {
        title_en: { type: "string" },
        title_es: { type: "string" },
        excerpt_en: { type: "string" },
        excerpt_es: { type: "string" },
        body_en: { type: "string" },
        body_es: { type: "string" },
        category: {
          type: "string",
          description: "weather | specs | industry | regulation | field",
        },
        slug: { type: "string" },
        published: { type: "boolean" },
        source_url: { type: "string" },
      },
      required: ["title_en", "body_en"],
      additionalProperties: false,
    },
    handler: (userId, args) =>
      upsertNewsPost(userId, {
        titleEn: str(args, "title_en") ?? "",
        titleEs: str(args, "title_es"),
        excerptEn: str(args, "excerpt_en"),
        excerptEs: str(args, "excerpt_es"),
        bodyEn: str(args, "body_en") ?? "",
        bodyEs: str(args, "body_es"),
        category: str(args, "category"),
        slug: str(args, "slug"),
        published: args.published === undefined ? true : Boolean(args.published),
        sourceUrl: str(args, "source_url"),
      }),
  },
  {
    name: "update_news",
    description: "Update an existing news post by id (editors only).",
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "string" },
        title_en: { type: "string" },
        title_es: { type: "string" },
        excerpt_en: { type: "string" },
        excerpt_es: { type: "string" },
        body_en: { type: "string" },
        body_es: { type: "string" },
        category: { type: "string" },
        slug: { type: "string" },
        published: { type: "boolean" },
        source_url: { type: "string" },
      },
      required: ["id", "title_en", "body_en"],
      additionalProperties: false,
    },
    handler: (userId, args) =>
      upsertNewsPost(userId, {
        id: str(args, "id"),
        titleEn: str(args, "title_en") ?? "",
        titleEs: str(args, "title_es"),
        excerptEn: str(args, "excerpt_en"),
        excerptEs: str(args, "excerpt_es"),
        bodyEn: str(args, "body_en") ?? "",
        bodyEs: str(args, "body_es"),
        category: str(args, "category"),
        slug: str(args, "slug"),
        published: args.published === undefined ? true : Boolean(args.published),
        sourceUrl: str(args, "source_url"),
      }),
  },
  {
    name: "delete_news",
    description: "Delete a news post by id (editors only).",
    inputSchema: {
      type: "object",
      properties: { id: { type: "string" } },
      required: ["id"],
      additionalProperties: false,
    },
    handler: (userId, args) => deleteNewsById(userId, str(args, "id") ?? ""),
  },
];

export function listMcpToolDescriptors() {
  return MCP_TOOLS.map(({ name, description, inputSchema }) => ({
    name,
    description,
    inputSchema,
  }));
}

export async function callMcpTool(
  userId: string,
  name: string,
  args: Record<string, unknown>,
): Promise<{ ok: true; result: unknown } | { ok: false; error: string }> {
  const tool = MCP_TOOLS.find((t) => t.name === name);
  if (!tool) return { ok: false, error: `Unknown tool: ${name}` };
  try {
    const result = await tool.handler(userId, args);
    return { ok: true, result };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Tool failed.",
    };
  }
}
