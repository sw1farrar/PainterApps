import type { AddressFields } from "@/lib/address";

type GoogleAddressComponent = {
  longText?: string;
  shortText?: string;
  types?: string[];
};

function componentValue(
  components: GoogleAddressComponent[],
  type: string,
  useShort = false,
): string {
  const match = components.find((component) => component.types?.includes(type));
  if (!match) return "";
  return (useShort ? match.shortText : match.longText)?.trim() ?? "";
}

export function parseGoogleAddressComponents(
  components: GoogleAddressComponent[],
): AddressFields {
  const streetNumber = componentValue(components, "street_number");
  const route = componentValue(components, "route");
  const address = [streetNumber, route].filter(Boolean).join(" ");

  const city =
    componentValue(components, "locality") ||
    componentValue(components, "postal_town") ||
    componentValue(components, "sublocality") ||
    componentValue(components, "administrative_area_level_3");

  return {
    address,
    address_line2: componentValue(components, "subpremise"),
    city,
    state: componentValue(components, "administrative_area_level_1", true),
    zip: componentValue(components, "postal_code"),
  };
}