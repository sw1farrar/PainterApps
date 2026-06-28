export function stripPhoneDigits(value: string): string {
  return value.replace(/\D/g, "").slice(0, 10);
}

export function formatPhoneNumber(value: string): string {
  const digits = stripPhoneDigits(value);
  if (digits.length === 0) return "";
  if (digits.length < 4) {
    return digits.length === 3 ? `(${digits})` : `(${digits}`;
  }
  if (digits.length < 7) {
    return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
  }
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
}

export function formatPhoneDisplay(
  value: string | null | undefined,
): string {
  if (!value?.trim()) return "";
  return formatPhoneNumber(value);
}

export function normalizePhoneForStorage(
  value: string | null | undefined,
): string | null {
  const formatted = formatPhoneNumber(value ?? "");
  return stripPhoneDigits(formatted).length > 0 ? formatted : null;
}

export function isCompletePhoneNumber(value: string | null | undefined): boolean {
  return stripPhoneDigits(value ?? "").length === 10;
}