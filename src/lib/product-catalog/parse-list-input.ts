import { parseStringArray } from "@/lib/product-catalog/enrichment-status";

export function parseListInput(value: string): string[] {
  const lines = value
    .split(/\r?\n/)
    .flatMap((line) => line.split(","))
    .map((entry) => entry.trim())
    .filter(Boolean);

  return parseStringArray(lines);
}

export function formatListInput(values: string[]): string {
  return values.join("\n");
}