import { readFileSync } from "node:fs";

const env = Object.fromEntries(
  readFileSync(".env.local", "utf8")
    .split(/\r?\n/)
    .filter(Boolean)
    .map((line) => {
      const idx = line.indexOf("=");
      return [line.slice(0, idx), line.slice(idx + 1)];
    }),
);

const key = env.GOOGLE_PLACES_API_KEY;
if (!key) {
  console.error("GOOGLE_PLACES_API_KEY missing from .env.local");
  process.exit(1);
}

const response = await fetch("https://places.googleapis.com/v1/places:autocomplete", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "X-Goog-Api-Key": key,
    "X-Goog-FieldMask":
      "suggestions.placePrediction.placeId,suggestions.placePrediction.text.text",
  },
  body: JSON.stringify({
    input: "123 Main St Austin",
    includedRegionCodes: ["us"],
  }),
});

const body = await response.text();
console.log("status:", response.status);
console.log(body.slice(0, 800));