import type { LineItemInput } from "@/app/app/(portal)/quotes/actions";
import type { TaggedLineItem } from "./types";

export function tagManualLineItems(items: LineItemInput[]): TaggedLineItem[] {
  return items.map((item) => ({
    ...item,
    source: item.source ?? "manual",
  }));
}