export function getGoogleCustomSearchApiKey(): string | null {
  const dedicated = process.env.GOOGLE_CUSTOM_SEARCH_API_KEY?.trim();
  if (dedicated) return dedicated;

  const places = process.env.GOOGLE_PLACES_API_KEY?.trim();
  return places || null;
}

export function getGoogleCustomSearchEngineId(): string | null {
  const engineId = process.env.GOOGLE_CUSTOM_SEARCH_ENGINE_ID?.trim();
  return engineId || null;
}

export function getGoogleImageSearchConfigError(): string | null {
  if (!getGoogleCustomSearchApiKey()) {
    return "Image search is not configured on this server.";
  }

  if (!getGoogleCustomSearchEngineId()) {
    return "Image search engine is not configured on this server.";
  }

  return null;
}