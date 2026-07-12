import {
  SIMPLE_QUOTE_STEPS,
  type SimpleQuoteStep,
} from "@/lib/quotes/simple-builder";

const STORAGE_KEY = "painterapps:quote-wizard";

export type QuoteWizardSession = {
  quoteId: string;
  step: SimpleQuoteStep;
  maxReachedIndex: number;
};

function isSimpleQuoteStep(value: string): value is SimpleQuoteStep {
  return (SIMPLE_QUOTE_STEPS as readonly string[]).includes(value);
}

export function readQuoteWizardSession(
  quoteId: string,
): QuoteWizardSession | null {
  if (typeof window === "undefined" || !quoteId) return null;

  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as QuoteWizardSession;
    if (parsed.quoteId !== quoteId) return null;
    if (!isSimpleQuoteStep(parsed.step)) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function readQuoteWizardStepFromUrl(): SimpleQuoteStep | null {
  if (typeof window === "undefined") return null;
  const step = new URLSearchParams(window.location.search).get("step");
  if (!step || !isSimpleQuoteStep(step)) return null;
  return step;
}

export function writeQuoteWizardSession(session: QuoteWizardSession): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(session));
  } catch {
    // Ignore quota / privacy mode errors.
  }
}

export function syncQuoteWizardUrl(quoteId: string, step: SimpleQuoteStep): void {
  if (typeof window === "undefined" || !quoteId) return;
  const url = new URL(window.location.href);
  url.pathname = `/app/quotes/${quoteId}`;
  url.searchParams.set("step", step);
  window.history.replaceState(null, "", `${url.pathname}${url.search}`);
}