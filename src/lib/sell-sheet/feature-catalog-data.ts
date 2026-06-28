export const SELL_SHEET_FEATURE_CATEGORIES = [
  { id: "prep", label: "Surface prep" },
  { id: "paint", label: "Application & scope" },
  { id: "warranty", label: "Warranties" },
  { id: "maintenance", label: "Maintenance & cleaning" },
  { id: "service", label: "Service & extras" },
] as const;

export type SellSheetFeatureCategoryId =
  (typeof SELL_SHEET_FEATURE_CATEGORIES)[number]["id"];

export type SellSheetFeatureScope = "interior" | "exterior" | "both";

export type SellSheetFeatureCatalogItem = {
  id: string;
  label: string;
  category: SellSheetFeatureCategoryId;
  scope: SellSheetFeatureScope;
};

export const SELL_SHEET_FEATURE_CATALOG: SellSheetFeatureCatalogItem[] = [
  // Surface prep
  {
    id: "pressure-wash",
    label: "Full exterior pressure wash",
    category: "prep",
    scope: "exterior",
  },
  {
    id: "hand-scrape",
    label: "Hand scraping of loose & peeling paint",
    category: "prep",
    scope: "both",
  },
  {
    id: "mildew-treatment",
    label: "Mildew, algae & stain treatment",
    category: "prep",
    scope: "exterior",
  },
  {
    id: "caulking",
    label: "Caulking of gaps, cracks & joints",
    category: "prep",
    scope: "both",
  },
  {
    id: "spot-prime",
    label: "Spot priming of bare wood & metal",
    category: "prep",
    scope: "both",
  },
  {
    id: "full-prime",
    label: "Full prime coat on bare surfaces",
    category: "prep",
    scope: "both",
  },
  {
    id: "sanding",
    label: "Sanding & feathering for smooth finish",
    category: "prep",
    scope: "both",
  },
  {
    id: "masking",
    label: "Masking & protection of windows, landscaping & fixtures",
    category: "prep",
    scope: "exterior",
  },
  {
    id: "interior-protection",
    label: "Interior furniture & floor protection",
    category: "prep",
    scope: "interior",
  },
  {
    id: "wood-repair",
    label: "Minor wood rot repair & filler",
    category: "prep",
    scope: "both",
  },

  // Application & scope (paint product details belong on the tier paint line)
  {
    id: "two-coat",
    label: "Two-coat application guarantee",
    category: "paint",
    scope: "both",
  },
  {
    id: "spray-roll",
    label: "Spray & back-roll for uniform coverage",
    category: "paint",
    scope: "both",
  },
  {
    id: "trim-accent",
    label: "Trim, shutters & accent color included",
    category: "paint",
    scope: "both",
  },
  {
    id: "garage-door",
    label: "Garage door painting included",
    category: "paint",
    scope: "exterior",
  },
  {
    id: "deck-fence-stain",
    label: "Deck or fence staining add-on",
    category: "paint",
    scope: "exterior",
  },
  {
    id: "color-consult",
    label: "Professional color consultation",
    category: "paint",
    scope: "both",
  },

  // Warranties
  {
    id: "warranty-1yr",
    label: "1-year workmanship warranty",
    category: "warranty",
    scope: "both",
  },
  {
    id: "warranty-2yr",
    label: "2-year workmanship warranty",
    category: "warranty",
    scope: "both",
  },
  {
    id: "warranty-5yr",
    label: "5-year workmanship warranty",
    category: "warranty",
    scope: "both",
  },
  {
    id: "warranty-7yr",
    label: "7-year workmanship warranty",
    category: "warranty",
    scope: "both",
  },
  {
    id: "warranty-10yr",
    label: "10-year workmanship warranty",
    category: "warranty",
    scope: "both",
  },
  {
    id: "manufacturer-warranty",
    label: "Paint manufacturer warranty registration",
    category: "warranty",
    scope: "both",
  },
  {
    id: "written-warranty",
    label: "Written warranty certificate provided",
    category: "warranty",
    scope: "both",
  },

  // Maintenance & cleaning
  {
    id: "power-wash-2yr",
    label: "Complimentary power wash at 2 years",
    category: "maintenance",
    scope: "exterior",
  },
  {
    id: "annual-inspection",
    label: "Annual exterior inspection",
    category: "maintenance",
    scope: "exterior",
  },
  {
    id: "window-cleaning",
    label: "Exterior window cleaning included",
    category: "maintenance",
    scope: "exterior",
  },
  {
    id: "gutter-cleaning",
    label: "Gutter cleaning included",
    category: "maintenance",
    scope: "exterior",
  },
  {
    id: "caulk-inspection",
    label: "Caulk & seal inspection at 1 year",
    category: "maintenance",
    scope: "both",
  },
  {
    id: "touch-up-kit",
    label: "Homeowner touch-up kit left on site",
    category: "maintenance",
    scope: "both",
  },

  // Service & extras
  {
    id: "project-manager",
    label: "Dedicated project manager",
    category: "service",
    scope: "both",
  },
  {
    id: "daily-photos",
    label: "Daily progress photos",
    category: "service",
    scope: "both",
  },
  {
    id: "walkthrough",
    label: "Pre-job walkthrough & scope review",
    category: "service",
    scope: "both",
  },
  {
    id: "final-walkthrough",
    label: "Final walkthrough with homeowner",
    category: "service",
    scope: "both",
  },
  {
    id: "priority-scheduling",
    label: "Priority scheduling",
    category: "service",
    scope: "both",
  },
  {
    id: "mailbox-post",
    label: "Mailbox & post painting",
    category: "service",
    scope: "exterior",
  },
  {
    id: "same-day-cleanup",
    label: "Same-day jobsite cleanup",
    category: "service",
    scope: "both",
  },
  {
    id: "weekend-available",
    label: "Weekend & evening availability",
    category: "service",
    scope: "both",
  },
];