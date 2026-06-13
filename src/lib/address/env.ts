export function getGooglePlacesApiKey(): string | null {
  const key = process.env.GOOGLE_PLACES_API_KEY?.trim();
  return key || null;
}

export function isAddressAutocompleteEnabled(): boolean {
  return getGooglePlacesApiKey() !== null;
}