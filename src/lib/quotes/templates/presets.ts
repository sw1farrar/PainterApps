import type { QuoteJobType } from "@/types/database";
import type { RoomInput } from "@/app/app/(portal)/quotes/actions";

export type QuoteTemplatePreset = {
  id: string;
  name: string;
  description: string;
  jobType: QuoteJobType;
  rooms: Omit<RoomInput, "sort_order" | "photo_url" | "is_optional" | "length_ft" | "width_ft" | "height_ft">[];
};

export const QUOTE_TEMPLATE_PRESETS: QuoteTemplatePreset[] = [
  {
    id: "blank",
    name: "Blank",
    description: "Empty quote — add areas yourself",
    jobType: "interior",
    rooms: [],
  },
  {
    id: "3bed-interior",
    name: "Full 3-Bed Interior",
    description: "Living room, kitchen, 3 bedrooms, 2 baths",
    jobType: "interior",
    rooms: [
      { name: "Living Room", surface_type: "drywall", condition: "good", sq_ft: 320, color_codes: "", coats: 2, prep_work: "" },
      { name: "Kitchen", surface_type: "drywall", condition: "fair", sq_ft: 180, color_codes: "", coats: 2, prep_work: "" },
      { name: "Primary Bedroom", surface_type: "drywall", condition: "good", sq_ft: 220, color_codes: "", coats: 2, prep_work: "" },
      { name: "Bedroom 2", surface_type: "drywall", condition: "good", sq_ft: 150, color_codes: "", coats: 2, prep_work: "" },
      { name: "Bedroom 3", surface_type: "drywall", condition: "good", sq_ft: 140, color_codes: "", coats: 2, prep_work: "" },
      { name: "Hall Bath", surface_type: "drywall", condition: "good", sq_ft: 80, color_codes: "", coats: 2, prep_work: "" },
      { name: "Primary Bath", surface_type: "drywall", condition: "fair", sq_ft: 100, color_codes: "", coats: 2, prep_work: "" },
    ],
  },
  {
    id: "exterior-refresh",
    name: "Exterior Refresh",
    description: "Siding, trim, and front door",
    jobType: "exterior",
    rooms: [
      { name: "Main Siding", surface_type: "exterior", condition: "fair", sq_ft: 1200, color_codes: "", coats: 2, prep_work: "Power wash" },
      { name: "Trim", surface_type: "wood", condition: "fair", sq_ft: 280, color_codes: "", coats: 2, prep_work: "" },
      { name: "Front Door", surface_type: "wood", condition: "good", sq_ft: 40, color_codes: "", coats: 2, prep_work: "" },
    ],
  },
];