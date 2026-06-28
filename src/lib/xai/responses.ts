import { getXaiApiKey, getXaiBaseUrl } from "@/lib/xai/env";
import { resolveXaiModel } from "@/lib/xai/resolve-model";

export type XaiWebSearchToolOptions = {
  enableImageSearch?: boolean;
  enableImageUnderstanding?: boolean;
  allowedDomains?: string[];
};

export type XaiImageInput = {
  imageUrl: string;
  detail?: "high" | "low" | "auto";
};

export type XaiResponseInput = {
  instructions?: string;
  prompt: string;
  model?: string;
  webSearch?: boolean | XaiWebSearchToolOptions;
  /** When set, sends a vision request (no web search). store must be false. */
  image?: XaiImageInput;
};

export type XaiResponseResult =
  | { success: true; text: string; citations: string[] }
  | { success: false; error: string };

type XaiResponsePayload = {
  output?: Array<{
    type?: string;
    role?: string;
    content?: Array<{
      type?: string;
      text?: string;
    }>;
  }>;
  citations?: string[];
  error?: {
    message?: string;
  };
};

function collectResponseText(payload: XaiResponsePayload): string {
  const chunks: string[] = [];

  for (const item of payload.output ?? []) {
    if (item.type === "message") {
      for (const part of item.content ?? []) {
        if (part.type === "output_text" && part.text?.trim()) {
          chunks.push(part.text.trim());
        }
      }
    }
  }

  return chunks.join("\n").trim();
}

export async function createXaiResponse(
  input: XaiResponseInput,
): Promise<XaiResponseResult> {
  const apiKey = getXaiApiKey();
  if (!apiKey) {
    return {
      success: false,
      error: "xAI is not configured. Set XAI_API_KEY in your environment.",
    };
  }

  const baseUrl = getXaiBaseUrl().replace(/\/$/, "");
  const resolvedModel = input.model ?? (await resolveXaiModel());
  const webSearchOptions =
    typeof input.webSearch === "object" ? input.webSearch : undefined;

  const useVision = Boolean(input.image?.imageUrl);

  const tools =
    useVision || input.webSearch === false
      ? undefined
      : [
          {
            type: "web_search",
            enable_image_search: webSearchOptions?.enableImageSearch ?? true,
            enable_image_understanding:
              webSearchOptions?.enableImageUnderstanding ?? true,
            ...(webSearchOptions?.allowedDomains?.length
              ? {
                  filters: {
                    allowed_domains: webSearchOptions.allowedDomains.slice(0, 5),
                  },
                }
              : {}),
          },
        ];

  const userContent = useVision
    ? [
        {
          type: "input_image",
          image_url: input.image!.imageUrl,
          detail: input.image!.detail ?? "high",
        },
        {
          type: "input_text",
          text: input.prompt,
        },
      ]
    : input.prompt;

  const response = await fetch(`${baseUrl}/responses`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: resolvedModel,
      ...(input.instructions ? { instructions: input.instructions } : {}),
      input: [
        {
          role: "user",
          content: userContent,
        },
      ],
      ...(tools ? { tools } : {}),
      store: false,
    }),
  });

  let payload: XaiResponsePayload;
  try {
    payload = (await response.json()) as XaiResponsePayload;
  } catch {
    return {
      success: false,
      error: `xAI returned an invalid response (HTTP ${response.status}).`,
    };
  }

  if (!response.ok) {
    return {
      success: false,
      error:
        payload.error?.message ??
        `xAI request failed with status ${response.status}.`,
    };
  }

  const text = collectResponseText(payload);
  if (!text) {
    return { success: false, error: "xAI returned an empty response." };
  }

  return {
    success: true,
    text,
    citations: payload.citations ?? [],
  };
}