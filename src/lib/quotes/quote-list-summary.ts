export type QuoteListRoom = {
  name: string;
  sort_order?: number | null;
};

export type QuoteListTierPaintConfig = {
  tier: string;
  primer_product_id: string | null;
  topcoat_product_id: string | null;
};

export type QuoteListLineItem = {
  description: string;
  company_paint_product_id: string | null;
};

export function sortRoomsByOrder(rooms: QuoteListRoom[]): QuoteListRoom[] {
  return [...rooms].sort(
    (left, right) => (left.sort_order ?? 0) - (right.sort_order ?? 0),
  );
}

export function formatAreaSummary(rooms: QuoteListRoom[]): string {
  const names = sortRoomsByOrder(rooms)
    .map((room) => room.name.trim())
    .filter(Boolean);

  if (!names.length) return "No areas yet";

  if (names.length <= 3) return names.join(", ");

  return `${names.slice(0, 3).join(", ")} +${names.length - 3} more`;
}

export function collectQuoteProductIds(input: {
  tierPaintConfig?: QuoteListTierPaintConfig[] | null;
  lineItems?: QuoteListLineItem[] | null;
}): string[] {
  const ids = new Set<string>();
  const tierOrder = ["good", "better", "best"];

  const configs = [...(input.tierPaintConfig ?? [])].sort((left, right) => {
    const leftIndex = tierOrder.indexOf(left.tier);
    const rightIndex = tierOrder.indexOf(right.tier);
    return (
      (leftIndex === -1 ? 99 : leftIndex) - (rightIndex === -1 ? 99 : rightIndex)
    );
  });

  for (const config of configs) {
    if (config.topcoat_product_id) ids.add(config.topcoat_product_id);
    if (config.primer_product_id) ids.add(config.primer_product_id);
  }

  for (const item of input.lineItems ?? []) {
    if (item.company_paint_product_id) {
      ids.add(item.company_paint_product_id);
    }
  }

  return [...ids];
}

export function formatProductSummary(productNames: string[]): string {
  const names = [...new Set(productNames.map((name) => name.trim()).filter(Boolean))];

  if (!names.length) return "No products selected";

  if (names.length <= 2) return names.join(", ");

  return `${names.slice(0, 2).join(", ")} +${names.length - 2} more`;
}

export function quoteCardTitle(input: {
  name: string | null;
  customerName: string | null;
}): string {
  const jobName = input.name?.trim();
  if (jobName) return jobName;

  return input.customerName?.trim() || "Untitled estimate";
}

export function quoteCardSubtitle(input: {
  name: string | null;
  customerName: string | null;
}): string | null {
  const jobName = input.name?.trim();
  const customerName = input.customerName?.trim();

  if (jobName && customerName) return customerName;

  return null;
}