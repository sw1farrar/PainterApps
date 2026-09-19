import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function isUsZip(value: string): boolean {
  return /^\d{5}$/.test(value.trim());
}

export function formatZip(value: string): string {
  return value.replace(/\D/g, "").slice(0, 5);
}
