export type OptionPreset = {
  id: string;
  label: string;
  description: string;
  type: "labor" | "material" | "extra";
  qty: number;
  unit_cost: number;
  markup: number;
};

export const QUOTE_OPTION_PRESETS: OptionPreset[] = [
  {
    id: "cabinet-paint",
    label: "Cabinet painting",
    description: "Kitchen cabinet doors & boxes",
    type: "labor",
    qty: 8,
    unit_cost: 55,
    markup: 0,
  },
  {
    id: "deck-stain",
    label: "Deck stain",
    description: "Exterior deck wash & stain",
    type: "labor",
    qty: 6,
    unit_cost: 50,
    markup: 0,
  },
  {
    id: "popcorn-removal",
    label: "Popcorn ceiling removal",
    description: "Scrape, skim, and paint",
    type: "labor",
    qty: 4,
    unit_cost: 45,
    markup: 0,
  },
  {
    id: "wallpaper-removal",
    label: "Wallpaper removal",
    description: "Steam, prep, and prime",
    type: "labor",
    qty: 6,
    unit_cost: 45,
    markup: 0,
  },
  {
    id: "pressure-wash",
    label: "Pressure washing",
    description: "Pre-paint exterior wash",
    type: "extra",
    qty: 1,
    unit_cost: 250,
    markup: 10,
  },
  {
    id: "premium-caulk",
    label: "Premium caulk package",
    description: "Elastomeric caulk throughout",
    type: "material",
    qty: 1,
    unit_cost: 180,
    markup: 20,
  },
  {
    id: "color-consult",
    label: "Color consultation",
    description: "Designer color palette session",
    type: "extra",
    qty: 1,
    unit_cost: 150,
    markup: 0,
  },
  {
    id: "furniture-move",
    label: "Furniture moving",
    description: "Move & reset room contents",
    type: "labor",
    qty: 3,
    unit_cost: 40,
    markup: 0,
  },
];