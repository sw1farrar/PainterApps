import {
  deleteManufacturer,
  deleteProduct,
  deleteSystem,
  getProduct,
  getSystem,
  listManufacturers,
  listProducts,
  listApplicationTypes,
  listSystems,
  patchProduct,
  patchSystem,
  suggestSystems,
  upsertManufacturer,
  upsertProduct,
  upsertSystem,
} from "@/lib/mcp/catalog";
import {
  deleteDocument,
  getDocument,
  listDocuments,
  upsertDocument,
} from "@/lib/systems/documents";
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
    handler: (userId, args) => getNewsPost(str(args, "id") ?? "", userId),
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
  {
    name: "list_manufacturers",
    description:
      "List paint manufacturers (id, name, slug, website) from the live TDS catalog.",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
    handler: () => listManufacturers(),
  },
  {
    name: "create_manufacturer",
    description: "Add or update a manufacturer (editors only).",
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "string" },
        name: { type: "string" },
        slug: { type: "string" },
        website: { type: "string" },
        attrs: { type: "object" },
      },
      required: ["name"],
      additionalProperties: true,
    },
    handler: (userId, args) => upsertManufacturer(userId, args),
  },
  {
    name: "update_manufacturer",
    description: "Update a manufacturer by id (editors only).",
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "string" },
        name: { type: "string" },
        slug: { type: "string" },
        website: { type: "string" },
        attrs: { type: "object" },
      },
      required: ["id", "name"],
      additionalProperties: true,
    },
    handler: (userId, args) => upsertManufacturer(userId, args),
  },
  {
    name: "delete_manufacturer",
    description: "Delete a manufacturer and its products (editors only).",
    inputSchema: {
      type: "object",
      properties: { id: { type: "string" } },
      required: ["id"],
      additionalProperties: false,
    },
    handler: (userId, args) => deleteManufacturer(userId, str(args, "id") ?? ""),
  },
  {
    name: "list_products",
    description:
      "List products ordered by quality within each application (exterior finishes, interior finishes, trim, floors, primers). Each row includes a computed quality object: score 0–10 (10 best), application_class, resin, solids_pct, and claims. Optional filters: manufacturer_id, kind, interior, exterior, application_class, query.",
    inputSchema: {
      type: "object",
      properties: {
        query: { type: "string" },
        kind: { type: "string", description: "prep | primer | topcoat | other" },
        manufacturer_id: { type: "string" },
        exterior: { type: "boolean" },
        interior: { type: "boolean" },
        application_class: {
          type: "string",
          description:
            "exterior-topcoat | interior-topcoat | trim | floor | primer | other",
        },
      },
      additionalProperties: false,
    },
    handler: (_userId, args) => listProducts(args),
  },
  {
    name: "get_product",
    description:
      "Get one product by id (or SKU). Returns all typed TDS columns, attrs overflow, and a computed quality object (score, application_class, resin, solids_pct, claims). Quality is read-only.",
    inputSchema: {
      type: "object",
      properties: { id: { type: "string" } },
      required: ["id"],
      additionalProperties: false,
    },
    handler: (_userId, args) => getProduct(str(args, "id") ?? ""),
  },
  {
    name: "create_product",
    description:
      "Add or fully replace a product (editors only). Core fields plus any extra TDS attrs (rain_ready_minutes, min_dew_spread_f, recoat_hours, or free-form keys).",
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "string" },
        manufacturer_id: { type: "string" },
        name: { type: "string" },
        sku: { type: "string" },
        kind: { type: "string" },
        substrates: { type: "array", items: { type: "string" } },
        interior: { type: "boolean" },
        exterior: { type: "boolean" },
        voc_g_l: { type: "number" },
        sheens: { type: "array", items: { type: "string" } },
        min_temp_f: { type: "number" },
        max_temp_f: { type: "number" },
        max_humidity_pct: { type: "number" },
        min_dew_spread_f: { type: "number" },
        rain_ready_minutes: { type: "number" },
        recoat_hours: { type: "number" },
        tds_url: { type: "string" },
        tds_revision: { type: "string" },
        tds_date: { type: "string" },
        notes: { type: "string" },
        description: { type: "string" },
        features: { type: "array", items: { type: "string" } },
        benefits: { type: "array", items: { type: "string" } },
        volume_solids_pct: { type: "number" },
        weight_solids_pct: { type: "number" },
        resin_type: { type: "string" },
        vehicle_type: { type: "string" },
        can_image_url: { type: "string" },
        can_image_base64: { type: "string" },
        attrs: { type: "object" },
      },
      required: ["name", "manufacturer_id"],
      additionalProperties: true,
    },
    handler: (userId, args) => upsertProduct(userId, args),
  },
  {
    name: "update_product",
    description:
      "Patch a product by id (editors / platform_admin). Only provided fields change. Set description, features, benefits, volume_solids_pct, and resin_type — those drive the computed quality score returned on list and get. Typed TDS columns plus notes, tds_*, attrs. Extra keys merge into attrs. Never invents values. quality and quality_score are ignored.",
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "string" },
        manufacturer_id: { type: "string" },
        name: { type: "string" },
        sku: { type: "string" },
        kind: { type: "string" },
        substrates: { type: "array", items: { type: "string" } },
        interior: { type: "boolean" },
        exterior: { type: "boolean" },
        voc_g_l: { type: "number" },
        sheens: { type: "array", items: { type: "string" } },
        min_temp_f: { type: "number" },
        max_temp_f: { type: "number" },
        max_humidity_pct: { type: "number" },
        min_dew_spread_f: { type: "number" },
        rain_ready_minutes: { type: "number" },
        recoat_hours: { type: "number" },
        tds_url: { type: "string" },
        tds_revision: { type: "string" },
        tds_date: { type: "string" },
        notes: { type: "string" },
        description: {
          type: "string",
          description: "What the product does — shown in the product envelope.",
        },
        features: {
          type: "array",
          items: { type: "string" },
          description: "Feature bullets for the product envelope.",
        },
        benefits: {
          type: "array",
          items: { type: "string" },
          description: "Benefit bullets for the product envelope.",
        },
        volume_solids_pct: { type: "number" },
        weight_solids_pct: { type: "number" },
        coverage_sqft_gal_min: { type: "number" },
        coverage_sqft_gal_max: { type: "number" },
        wet_film_mils_min: { type: "number" },
        wet_film_mils_max: { type: "number" },
        dry_film_mils_min: { type: "number" },
        dry_film_mils_max: { type: "number" },
        dry_to_touch_hours: { type: "number" },
        full_cure_days: { type: "number" },
        washable_after_days: { type: "number" },
        vehicle_type: { type: "string" },
        resin_type: { type: "string" },
        weight_per_gallon_lbs: { type: "number" },
        viscosity: { type: "string" },
        flash_point: { type: "string" },
        ph_max_substrate: { type: "number" },
        clean_up: { type: "string" },
        thinner: { type: "string" },
        tint_system: { type: "string" },
        gloss_60_deg_min: { type: "number" },
        gloss_60_deg_max: { type: "number" },
        application_rh_max: { type: "number" },
        rain_ready_conditions: { type: "string" },
        storage_temp_f_min: { type: "number" },
        storage_temp_f_max: { type: "number" },
        spray_airless_psi_min: { type: "number" },
        spray_airless_psi_max: { type: "number" },
        spray_tip_min: { type: "string" },
        spray_tip_max: { type: "string" },
        pot_life_hours: { type: "number" },
        mix_ratio: { type: "string" },
        shelf_life_months: { type: "number" },
        official_tds_pdf_url: { type: "string" },
        can_image_url: {
          type: "string",
          description: "HTTPS URL of a paint-can photo (PNG/JPEG/WebP).",
        },
        can_image_base64: {
          type: "string",
          description:
            "PNG, JPEG, or WebP as base64 (optionally a data: URL). Stored in tds-cans and shown on Systems lists and product envelopes.",
        },
        certifications: { type: "array", items: { type: "string" } },
        astm_refs: { type: "array", items: { type: "string" } },
        attrs: { type: "object" },
      },
      required: ["id"],
      additionalProperties: true,
    },
    handler: (userId, args) => patchProduct(userId, args),
  },
  {
    name: "delete_product",
    description: "Delete a product not used by a system (editors only).",
    inputSchema: {
      type: "object",
      properties: { id: { type: "string" } },
      required: ["id"],
      additionalProperties: false,
    },
    handler: (userId, args) => deleteProduct(userId, str(args, "id") ?? ""),
  },
  {
    name: "list_application_types",
    description:
      "Canonical application tags for System Match filters (walls, parking-deck, wood-deck, trim, etc.). Use these values on create_system / update_system application_types.",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
    handler: async () => listApplicationTypes(),
  },
  {
    name: "list_systems",
    description:
      "List coating systems. Each row includes application_types used by the Systems page filters.",
    inputSchema: {
      type: "object",
      properties: {
        manufacturer_id: { type: "string" },
        exterior: { type: "boolean" },
        interior: { type: "boolean" },
        application_type: {
          type: "string",
          description:
            "walls | ceilings | trim | siding | floors | wood-deck | parking-deck | plaza-balcony | roof | below-grade | pool | fountain | masonry-waterproofing | metal",
        },
      },
      additionalProperties: false,
    },
    handler: (_userId, args) => listSystems(args),
  },
  {
    name: "get_system",
    description: "Get one coating system by id.",
    inputSchema: {
      type: "object",
      properties: { id: { type: "string" } },
      required: ["id"],
      additionalProperties: false,
    },
    handler: (_userId, args) => getSystem(str(args, "id") ?? ""),
  },
  {
    name: "create_system",
    description: "Add or update a primer/topcoat system (editors only).",
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "string" },
        manufacturer_id: { type: "string" },
        name: { type: "string" },
        interior: { type: "boolean" },
        exterior: { type: "boolean" },
        substrates: { type: "array", items: { type: "string" } },
        application_types: { type: "array", items: { type: "string" } },
        failure_modes: { type: "array", items: { type: "string" } },
        prep_notes: { type: "string" },
        primer_product_id: { type: "string" },
        topcoat_product_id: { type: "string" },
        midcoat_product_id: { type: "string" },
        why: { type: "string" },
        rank_hint: { type: "number" },
        attrs: { type: "object" },
      },
      required: [
        "name",
        "manufacturer_id",
        "primer_product_id",
        "topcoat_product_id",
      ],
      additionalProperties: true,
    },
    handler: (userId, args) => upsertSystem(userId, args),
  },
  {
    name: "update_system",
    description:
      "Patch a coating system by id (editors / platform_admin). Send only fields to change. application_types controls Systems page chips (list_application_types for the vocab). interior/exterior/substrates are the other filters.",
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "string" },
        manufacturer_id: { type: "string" },
        name: { type: "string" },
        interior: { type: "boolean" },
        exterior: { type: "boolean" },
        substrates: { type: "array", items: { type: "string" } },
        application_types: {
          type: "array",
          items: { type: "string" },
          description:
            "Replace the system's application tags. Values from list_application_types.",
        },
        failure_modes: { type: "array", items: { type: "string" } },
        prep_notes: { type: "string" },
        primer_product_id: { type: "string" },
        topcoat_product_id: { type: "string" },
        midcoat_product_id: { type: "string" },
        why: { type: "string" },
        rank_hint: { type: "number" },
        attrs: { type: "object" },
      },
      required: ["id"],
      additionalProperties: true,
    },
    handler: (userId, args) => patchSystem(userId, args),
  },
  {
    name: "delete_system",
    description: "Delete a coating system (editors only).",
    inputSchema: {
      type: "object",
      properties: { id: { type: "string" } },
      required: ["id"],
      additionalProperties: false,
    },
    handler: (userId, args) => deleteSystem(userId, str(args, "id") ?? ""),
  },
  {
    name: "suggest_systems",
    description:
      "Rank coating systems for a job. Pass substrate and ZIP (or temp_f/humidity) so suggestions follow today’s conditions.",
    inputSchema: {
      type: "object",
      properties: {
        zip: { type: "string" },
        substrate: { type: "string" },
        interior: { type: "boolean" },
        exterior: { type: "boolean" },
        failure_mode: { type: "string" },
        manufacturer_id: { type: "string" },
        voc_sensitive: { type: "boolean" },
        temp_f: { type: "number" },
        humidity: { type: "number" },
        rain_within_hours: { type: "number" },
      },
      required: ["substrate"],
      additionalProperties: false,
    },
    handler: (_userId, args) => suggestSystems(args),
  },
  {
    name: "list_tds_documents",
    description: "List product data sheets (PDFs) for a product, or all sheets.",
    inputSchema: {
      type: "object",
      properties: {
        product_id: { type: "string" },
      },
      additionalProperties: false,
    },
    handler: (_userId, args) => listDocuments(str(args, "product_id")),
  },
  {
    name: "get_tds_document",
    description: "Get one data sheet, including stored PDF URL and extracted text if present.",
    inputSchema: {
      type: "object",
      properties: { id: { type: "string" } },
      required: ["id"],
      additionalProperties: false,
    },
    handler: (_userId, args) => getDocument(str(args, "id") ?? ""),
  },
  {
    name: "create_tds_document",
    description:
      "Attach a product data sheet (editors only). Pass product_id plus url and/or pdf_base64. If url is a PDF, it is fetched and stored. kind: pds | sds | eds | other. Put extracted TDS text in raw_text so Grok can search it later.",
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "string" },
        product_id: { type: "string" },
        title: { type: "string" },
        kind: { type: "string" },
        url: { type: "string" },
        source_url: { type: "string" },
        revision: { type: "string" },
        published_at: { type: "string" },
        raw_text: { type: "string" },
        pdf_base64: { type: "string" },
        file_name: { type: "string" },
        fetch_pdf: { type: "boolean" },
      },
      required: ["product_id"],
      additionalProperties: true,
    },
    handler: (userId, args) => upsertDocument(userId, args),
  },
  {
    name: "update_tds_document",
    description: "Update a stored data sheet (editors only).",
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "string" },
        product_id: { type: "string" },
        title: { type: "string" },
        kind: { type: "string" },
        url: { type: "string" },
        revision: { type: "string" },
        published_at: { type: "string" },
        raw_text: { type: "string" },
        pdf_base64: { type: "string" },
        file_name: { type: "string" },
        fetch_pdf: { type: "boolean" },
      },
      required: ["id", "product_id"],
      additionalProperties: true,
    },
    handler: (userId, args) => upsertDocument(userId, args),
  },
  {
    name: "delete_tds_document",
    description: "Delete a data sheet and its stored PDF (editors only).",
    inputSchema: {
      type: "object",
      properties: { id: { type: "string" } },
      required: ["id"],
      additionalProperties: false,
    },
    handler: (userId, args) => deleteDocument(userId, str(args, "id") ?? ""),
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
