export type QuoteEditorMode = "guided" | "power";

const STORAGE_KEY = "painterapps-quote-editor-mode";
const ONBOARDING_KEY = "painterapps-quote-editor-onboarding";
const PAINT_ONBOARDING_KEY = "painterapps-quote-paint-onboarding";

export function getStoredEditorMode(): QuoteEditorMode {
  if (typeof window === "undefined") return "guided";
  const stored = window.localStorage.getItem(STORAGE_KEY);
  return stored === "power" ? "power" : "guided";
}

export function setStoredEditorMode(mode: QuoteEditorMode) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, mode);
}

export function getEditorOnboardingSeen(): Record<QuoteEditorMode, boolean> {
  if (typeof window === "undefined") {
    return { guided: true, power: true };
  }
  try {
    const raw = window.localStorage.getItem(ONBOARDING_KEY);
    if (!raw) return { guided: false, power: false };
    const parsed = JSON.parse(raw) as Partial<Record<QuoteEditorMode, boolean>>;
    return {
      guided: parsed.guided ?? false,
      power: parsed.power ?? false,
    };
  } catch {
    return { guided: false, power: false };
  }
}

export function setEditorOnboardingSeen(mode: QuoteEditorMode) {
  if (typeof window === "undefined") return;
  const seen = getEditorOnboardingSeen();
  seen[mode] = true;
  window.localStorage.setItem(ONBOARDING_KEY, JSON.stringify(seen));
}

export function getPaintOnboardingSeen(): boolean {
  if (typeof window === "undefined") return true;
  return window.localStorage.getItem(PAINT_ONBOARDING_KEY) === "1";
}

export function setPaintOnboardingSeen() {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(PAINT_ONBOARDING_KEY, "1");
}