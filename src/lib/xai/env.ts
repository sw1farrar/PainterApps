import { DEFAULT_XAI_MODEL_ID } from "@/lib/xai/models";

const DEFAULT_XAI_BASE_URL = "https://api.x.ai/v1";

export function getXaiApiKey(): string | null {
  const key = process.env.XAI_API_KEY?.trim();
  return key || null;
}

export function getXaiBaseUrl(): string {
  return process.env.XAI_BASE_URL?.trim() || DEFAULT_XAI_BASE_URL;
}

/** Sync fallback for scripts; server AI calls should use `resolveXaiModel`. */
export function getXaiModel(): string {
  const envModel = process.env.XAI_MODEL?.trim();
  if (envModel) return envModel;
  return DEFAULT_XAI_MODEL_ID;
}

export function isXaiConfigured(): boolean {
  return getXaiApiKey() !== null;
}

export function getXaiEnvError(): string | null {
  if (!getXaiApiKey()) {
    return "xAI is not configured. Set XAI_API_KEY in your environment.";
  }

  return null;
}