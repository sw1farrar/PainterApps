import type { AiLookupProgressStepId } from "@/lib/sell-sheet/ai-lookup-error";

export type AiLookupProgressLabels = {
  title: string;
  failedTitle: string;
  complete: string;
  close: string;
  tryAgain: string;
  steps: Record<AiLookupProgressStepId, string>;
  stepHints: Record<AiLookupProgressStepId, string>;
  errors: {
    headlines: {
      search: string;
      download: string;
      verify: string;
      analyze: string;
      generic: string;
    };
    tips: {
      retry: string;
      specificName: string;
      checkApplication: string;
      uploadManual: string;
    };
  };
};

/** Default step-by-step AI lookup labels (sell sheets, product catalog, etc.). */
export const DEFAULT_AI_LOOKUP_PROGRESS_LABELS: AiLookupProgressLabels = {
  title: "Finding your product",
  failedTitle: "Couldn't find product",
  complete: "Product ready",
  close: "Close",
  tryAgain: "Try again",
  steps: {
    searching: "Searching manufacturer's website",
    foundProduct: "Found matching product",
    downloadingImage: "Finding paint can on product page",
    verifyingLabel: "Downloading can image",
    analyzingFeatures: "Pulling coating specs from product page",
    applying: "Preparing your selection",
  },
  stepHints: {
    searching: "Checking the official manufacturer site",
    foundProduct: "Matched your paint line",
    analyzingFeatures: "Building your feature list to choose from",
    downloadingImage: "Locating the official can photo",
    verifyingLabel: "Downloading the manufacturer image",
    applying: "Almost ready to choose a can image",
  },
  errors: {
    headlines: {
      search: "Couldn't find that product online",
      download: "Found the product — couldn't load the image",
      verify: "Image didn't match the product label",
      analyze: "Found the product page — finishing setup",
      generic: "Something went wrong",
    },
    tips: {
      retry:
        "Try again — we'll pull the image directly from the manufacturer's product page.",
      specificName:
        'Use the exact product line name from the can label, e.g. "Premium Exterior Acrylic" or "Interior Flat Latex".',
      checkApplication:
        "Confirm Interior or Exterior matches the product you're selling.",
      uploadManual: "You can also upload a paint can photo manually below.",
    },
  },
};

/** Product catalog custom-product lookup — not sell sheets. */
export const CATALOG_AI_LOOKUP_PROGRESS_LABELS: AiLookupProgressLabels = {
  ...DEFAULT_AI_LOOKUP_PROGRESS_LABELS,
  steps: {
    searching: "Searching manufacturer's website",
    foundProduct: "Found product data sheet",
    downloadingImage: "Finding paint can on product page",
    verifyingLabel: "Downloading can image",
    analyzingFeatures: "Reading technical data sheet",
    applying: "Filling in your product form",
  },
  stepHints: {
    searching: "Locating the official TDS or PDS",
    foundProduct: "Matched your product line",
    analyzingFeatures: "Pulling coating specs, uses, and substrates",
    downloadingImage: "Locating the official can photo",
    verifyingLabel: "Saving the manufacturer product image",
    applying: "Applying catalog attributes to your form",
  },
  errors: {
    headlines: {
      search: "Couldn't find that product on the manufacturer site",
      download: "Found the product — couldn't load the can image",
      verify: "Couldn't download the manufacturer can image",
      analyze: "Found the data sheet — finishing catalog setup",
      generic: "Something went wrong",
    },
    tips: {
      retry:
        "Try again with the exact product line name from the can label or data sheet.",
      specificName:
        'Use the exact product line name from the label, e.g. "Premium Exterior Acrylic" or "Interior Flat Latex".',
      checkApplication:
        "Review the Scope field after lookup — AI infers interior/exterior from the data sheet.",
      uploadManual:
        "You can paste a can image URL in the form below.",
    },
  },
};