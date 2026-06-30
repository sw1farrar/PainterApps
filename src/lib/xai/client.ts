import {
  getXaiApiKey,
  getXaiBaseUrl,
  getXaiEnvError,
} from "@/lib/xai/env";
import { resolveXaiModel } from "@/lib/xai/resolve-model";

export type XaiChatRole = "system" | "user" | "assistant";

export type XaiChatMessage = {
  role: XaiChatRole;
  content: string;
};

export type XaiChatCompletionInput = {
  messages: XaiChatMessage[];
  model?: string;
  temperature?: number;
  maxCompletionTokens?: number;
};

export type XaiChatCompletionResult =
  | { success: true; content: string; model: string }
  | { success: false; error: string };

type XaiChatCompletionResponse = {
  model?: string;
  choices?: Array<{
    message?: {
      content?: string | null;
    };
  }>;
  error?: {
    message?: string;
  };
};

export async function createXaiChatCompletion(
  input: XaiChatCompletionInput,
): Promise<XaiChatCompletionResult> {
  const envError = getXaiEnvError();
  if (envError) {
    return { success: false, error: envError };
  }

  const apiKey = getXaiApiKey()!;
  const baseUrl = getXaiBaseUrl().replace(/\/$/, "");
  const resolvedModel = input.model ?? (await resolveXaiModel());

  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: resolvedModel,
      messages: input.messages,
      temperature: input.temperature ?? 0.7,
      ...(input.maxCompletionTokens
        ? { max_completion_tokens: input.maxCompletionTokens }
        : {}),
    }),
  });

  let payload: XaiChatCompletionResponse;
  try {
    payload = (await response.json()) as XaiChatCompletionResponse;
  } catch {
    return {
      success: false,
      error: `AI returned an invalid response (HTTP ${response.status}).`,
    };
  }

  if (!response.ok) {
    return {
      success: false,
      error:
        payload.error?.message ??
        `AI request failed with status ${response.status}.`,
    };
  }

  const content = payload.choices?.[0]?.message?.content?.trim();
  if (!content) {
    return { success: false, error: "AI returned an empty response." };
  }

  return {
    success: true,
    content,
    model: payload.model ?? resolvedModel,
  };
}