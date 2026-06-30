import type { Company, QuoteEstimationMode, QuoteJobType } from "@/types/database";
import type {
  LineItemInput,
  RoomInput,
  SurfaceInput,
} from "@/app/app/(portal)/quotes/actions";
import type {
  CompanyPaintProductRow,
  ResolvedTierPaintConfig,
} from "@/lib/paint-library/types";
import type { BaselinePaintSystemInput } from "@/lib/quotes/baseline-paint";
import type { QuotePaintDefaultInput } from "@/lib/quotes/paint-defaults";

export type EstimationSource = "room" | "surface" | "manual";

export type TaggedLineItem = LineItemInput & {
  source: EstimationSource;
  room_index?: number;
};

export type QuoteEstimateContext = {
  company: Company;
  rooms: RoomInput[];
  surfaces: SurfaceInput[];
  manualItems: LineItemInput[];
  estimationMode?: QuoteEstimationMode;
  jobType?: QuoteJobType;
  goodTierPaint?: ResolvedTierPaintConfig | null;
  paintDefaults?: QuotePaintDefaultInput[];
  baselineSystems?: BaselinePaintSystemInput[];
  productsById?: Map<string, CompanyPaintProductRow>;
};