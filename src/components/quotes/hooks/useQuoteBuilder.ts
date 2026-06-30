"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  createQuote,
  duplicateQuote,
  fetchQuoteChildren,
  resendQuote,
  reviseQuoteToDraft,
  saveQuoteDraft,
  sendQuote,
  updateQuote,
  type LineItemInput,
  type QuoteDraftInput,
  type RoomInput,
  type SurfaceInput,
  type TierInput,
  type TierPaintConfigInput,
} from "@/app/app/(portal)/quotes/actions";
import {
  fetchCompanyTierDefaults,
  listCompanyPaintProducts,
  listPaintPresets,
} from "@/app/app/(portal)/paint-library/actions";
import {
  defaultTierPaintState,
  isPaintConfigComplete,
  isPaintConfigListComplete,
  QUOTE_PAINT_TIERS,
  resolveTierPaintConfig,
} from "@/lib/paint-library/types";
import { DEFAULT_PRODUCT_COVERAGE_SQFT_PER_GALLON } from "@/lib/paint-library/coverage";
import type { CompanyPaintProductRow, CompanyPaintPresetRow } from "@/lib/paint-library/types";
import {
  buildProductsMap,
  computePaintableSqFt,
  computeTierAdjustments,
} from "@/lib/quotes/paint-quote-helpers";
import { collectTierFeatures } from "@/lib/quotes/estimation/paint-products";
import {
  buildLineItemsForArea,
  regenerateLineItems,
} from "@/lib/quotes/estimation";
import type { OptionPreset } from "@/lib/quotes/option-presets";
import {
  computeAreaCostBreakdown,
} from "@/lib/quotes/area-pricing";
import {
  buildIndexMapAfterBulkDelete,
  buildIndexMapAfterDelete,
  buildIndexMapAfterReorder,
  remapRoomIndices,
  wallSqFtFromDimensions,
} from "@/lib/quotes/area-helpers";
import { arrayMove } from "@dnd-kit/sortable";
import { readDefaultGrossMarginPct } from "@/lib/quotes/company-estimate-defaults";
import { getCompanyPricingSummary } from "@/lib/quotes/estimate-from-rooms";
import {
  calculateQuoteTotals,
  calculateTierPrices,
  estimateGallons,
  lineItemsSubtotal,
} from "@/lib/quotes/pricing";
import { hasMinimumJobAddress, type JobAddressFields } from "@/lib/address";
import {
  getStoredEditorMode,
  setStoredEditorMode,
  type QuoteEditorMode,
} from "@/lib/quotes/editor-mode";
import { serializeQuoteDraftForCompare } from "@/lib/quotes/draft-serialize";
import { enqueueQuoteSave } from "@/lib/quotes/save-coordinator";
import {
  formatQuoteTierLabel,
  QUOTE_TIER_LABELS,
} from "@/lib/quotes/tier-labels";
import type {
  Company,
  Customer,
  LineItemType,
  Quote,
  QuoteEstimationMode,
  QuoteJobType,
  QuoteLineItem,
  QuoteLineItemSource,
  QuoteRateType,
  QuoteRoom,
  QuoteSurface,
  QuoteSurfaceKind,
  QuoteTier,
  QuoteTierName,
  QuoteUpgradeRules,
} from "@/types/database";

export const QUOTE_STEPS = [
  "setup",
  "estimator",
  "line-items",
  "paint-options",
  "tiers",
  "polish",
  "review",
] as const;
export type QuoteStep = (typeof QUOTE_STEPS)[number];

export const QUOTE_STEP_META: {
  id: QuoteStep;
  label: string;
  short: string;
}[] = [
  { id: "setup", label: "Basics", short: "Basics" },
  { id: "estimator", label: "Areas", short: "Areas" },
  { id: "line-items", label: "Review", short: "Review" },
  { id: "paint-options", label: "Paint", short: "Paint" },
  { id: "tiers", label: "Options", short: "Options" },
  { id: "polish", label: "Polish", short: "Polish" },
  { id: "review", label: "Send", short: "Send" },
];

export const TIER_NAMES: QuoteTierName[] = [...QUOTE_PAINT_TIERS];

export const TIER_LABELS = {
  ...QUOTE_TIER_LABELS,
  beautiful: "Legacy package",
} as Record<QuoteTierName, string>;

export { formatQuoteTierLabel };

export const TIER_DEFAULTS: Record<
  (typeof QUOTE_PAINT_TIERS)[number],
  { features: string[]; benefits: string[] }
> = {
  good: {
    features: ["Standard paint", "Basic prep", "1-year warranty"],
    benefits: ["Affordable quality finish", "Reliable timeline"],
  },
  better: {
    features: ["Premium paint", "Enhanced prep", "2-year warranty"],
    benefits: ["Better coverage & durability", "Smoother finish"],
  },
  best: {
    features: ["Top-tier paint", "Full prep & repair", "3-year warranty"],
    benefits: ["Maximum durability", "Designer-grade finish"],
  },
};

export const EMPTY_ROOM: RoomInput = {
  name: "",
  surface_type: "drywall",
  condition: "good",
  sq_ft: 0,
  color_codes: "",
  coats: 2,
  prep_work: "",
  sort_order: 0,
  photo_url: null,
  is_optional: false,
  length_ft: null,
  width_ft: null,
  height_ft: null,
};

export const EMPTY_LINE_ITEM: LineItemInput = {
  type: "labor",
  description: "",
  qty: 1,
  unit_cost: 0,
  markup: 0,
  source: "manual",
  room_id: null,
  is_optional: false,
  sort_order: 0,
  company_paint_product_id: null,
  paint_role: null,
};

function parseLines(value: string): string[] {
  return value
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

function joinLines(values: string[]): string {
  return values.join("\n");
}

function mapRoomToInput(room: QuoteRoom, index: number): RoomInput {
  return {
    id: room.id,
    name: room.name,
    surface_type: room.surface_type,
    condition: room.condition,
    sq_ft: room.sq_ft,
    color_codes: room.color_codes,
    coats: room.coats,
    prep_work: room.prep_work,
    sort_order: room.sort_order ?? index,
    photo_url: room.photo_url,
    is_optional: room.is_optional ?? false,
    length_ft: room.length_ft,
    width_ft: room.width_ft,
    height_ft: room.height_ft,
  };
}

function sortRoomsByOrder<T extends { sort_order?: number | null }>(
  rooms: T[],
): T[] {
  return [...rooms].sort(
    (a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0),
  );
}

function mapSurfaceToInput(
  surface: QuoteSurface,
  rooms: QuoteRoom[],
): SurfaceInput {
  const roomIndex = rooms.findIndex((room) => room.id === surface.room_id);
  return {
    id: surface.id,
    room_id: surface.room_id,
    room_index: roomIndex >= 0 ? roomIndex : undefined,
    surface_type: surface.surface_type,
    sq_ft: surface.sq_ft,
    coats: surface.coats,
    unit_rate: surface.unit_rate,
    rate_type: surface.rate_type,
    notes: surface.notes,
    is_optional: surface.is_optional ?? false,
    sort_order: surface.sort_order ?? 0,
  };
}

function mapLineItemToInput(
  item: QuoteLineItem,
  index: number,
  rooms: QuoteRoom[],
): LineItemInput {
  const roomIndex =
    item.room_id != null
      ? rooms.findIndex((room) => room.id === item.room_id)
      : -1;
  return {
    id: item.id,
    type: item.type,
    description: item.description,
    qty: item.qty,
    unit_cost: item.unit_cost,
    markup: item.markup,
    source: item.source ?? "manual",
    room_id: item.room_id,
    room_index: roomIndex >= 0 ? roomIndex : undefined,
    is_optional: item.is_optional ?? false,
    sort_order: item.sort_order ?? index,
    company_paint_product_id: item.company_paint_product_id ?? null,
    paint_role: item.paint_role ?? null,
  };
}

export type UseQuoteBuilderOptions = {
  mode: "create" | "edit";
  initialStep?: QuoteStep;
  skipSetup?: boolean;
  quote?: Quote;
  rooms?: QuoteRoom[];
  surfaces?: QuoteSurface[];
  lineItems?: QuoteLineItem[];
  tiers?: QuoteTier[];
  tierPaintConfig?: TierPaintConfigInput[];
  customers: Customer[];
  company: Company;
  upgradeRules?: QuoteUpgradeRules | null;
  jobId?: string | null;
  workspaceMode?: "modal" | "page" | "document";
  onWorkspaceClose?: () => void;
  onPopOut?: () => void;
};

function isQuoteStep(value: string | null | undefined): value is QuoteStep {
  return QUOTE_STEPS.includes(value as QuoteStep);
}

export function getVisibleSteps(editorMode: QuoteEditorMode): QuoteStep[] {
  if (editorMode === "power") return [...QUOTE_STEPS];
  return QUOTE_STEPS.filter((step) => step !== "line-items");
}

type InferMaxReachedInput = {
  customerId: string;
  jobAddress: JobAddressFields;
  roomsCount: number;
  surfacesCount: number;
  lineItemsCount: number;
  tierState: Record<QuoteTierName, TierInput>;
  tierPaintConfig?: TierPaintConfigInput[];
  status: Quote["status"];
};

export function inferMaxReachedIndex({
  customerId,
  jobAddress,
  roomsCount,
  surfacesCount,
  lineItemsCount,
  tierState,
  tierPaintConfig = [],
  status,
}: InferMaxReachedInput): number {
  let max = 0;

  if (customerId && hasMinimumJobAddress(jobAddress)) {
    max = Math.max(max, QUOTE_STEPS.indexOf("estimator"));
  }
  if (roomsCount > 0 || surfacesCount > 0) {
    max = Math.max(max, QUOTE_STEPS.indexOf("estimator"));
  }
  if (lineItemsCount > 0) {
    max = Math.max(max, QUOTE_STEPS.indexOf("line-items"));
    max = Math.max(max, QUOTE_STEPS.indexOf("paint-options"));
    if (isPaintConfigListComplete(tierPaintConfig)) {
      max = Math.max(max, QUOTE_STEPS.indexOf("tiers"));
    }
  }
  if (TIER_NAMES.some((tier) => tierState[tier].price > 0)) {
    max = Math.max(max, QUOTE_STEPS.indexOf("polish"));
  }
  if (status !== "draft") {
    max = Math.max(max, QUOTE_STEPS.indexOf("review"));
  }

  return max;
}

function clampStepToProgress(
  step: QuoteStep,
  maxReachedIndex: number,
  editorMode: QuoteEditorMode,
): QuoteStep {
  let target = step;
  if (editorMode === "guided" && target === "line-items") {
    target = "tiers";
  }
  const targetIndex = QUOTE_STEPS.indexOf(target);
  if (editorMode === "guided" && targetIndex > maxReachedIndex) {
    return QUOTE_STEPS[Math.min(maxReachedIndex, QUOTE_STEPS.length - 1)];
  }
  return target;
}

export function getAdjacentStep(
  current: QuoteStep,
  direction: "next" | "back",
  editorMode: QuoteEditorMode,
): QuoteStep | null {
  const visible = getVisibleSteps(editorMode);
  const index = visible.indexOf(current);
  if (index < 0) return null;
  const nextIndex = direction === "next" ? index + 1 : index - 1;
  return visible[nextIndex] ?? null;
}

export function useQuoteBuilder({
  mode,
  initialStep,
  skipSetup = false,
  quote,
  rooms: initialRooms = [],
  surfaces: initialSurfaces = [],
  lineItems: initialLineItems = [],
  tiers: initialTiers = [],
  tierPaintConfig: initialTierPaintConfig = [],
  customers: initialCustomers,
  company,
  upgradeRules,
  jobId: initialJobId = null,
  workspaceMode = "page",
}: UseQuoteBuilderOptions) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const resolvedInitialStep: QuoteStep = (() => {
    if (initialStep && isQuoteStep(initialStep)) {
      return initialStep;
    }
    if (skipSetup) return "estimator";
    if (initialRooms.length > 0 || initialSurfaces.length > 0) {
      return "estimator";
    }
    if (initialLineItems.length > 0) {
      return isPaintConfigListComplete(initialTierPaintConfig)
        ? "tiers"
        : "paint-options";
    }
    if (initialTiers.some((tier) => tier.price > 0)) {
      return "polish";
    }
    if (quote?.status && quote.status !== "draft") {
      return "review";
    }
    return "setup";
  })();

  const initialJobAddress: JobAddressFields = {
    job_address: quote?.job_address ?? "",
    job_address_line2: quote?.job_address_line2 ?? "",
    job_city: quote?.job_city ?? "",
    job_state: quote?.job_state ?? "",
    job_zip: quote?.job_zip ?? "",
  };

  const initialMaxReachedIndex = inferMaxReachedIndex({
    customerId: quote?.customer_id ?? "",
    jobAddress: initialJobAddress,
    roomsCount: initialRooms.length,
    surfacesCount: initialSurfaces.length,
    lineItemsCount: initialLineItems.length,
    tierState: TIER_NAMES.reduce(
      (acc, tier) => {
        const existing = initialTiers.find((t) => t.tier === tier);
        acc[tier] = {
          tier,
          price: existing?.price ?? 0,
          margin: existing?.margin ?? 0,
          features: existing?.features ?? [],
          benefits: existing?.benefits ?? [],
        };
        return acc;
      },
      {} as Record<QuoteTierName, TierInput>,
    ),
    tierPaintConfig: initialTierPaintConfig,
    status: quote?.status ?? "draft",
  });

  const [step, setStep] = useState<QuoteStep>(() =>
    clampStepToProgress(
      resolvedInitialStep,
      initialMaxReachedIndex,
      getStoredEditorMode(),
    ),
  );
  const [maxReachedIndex, setMaxReachedIndex] = useState(
    initialMaxReachedIndex,
  );
  const [jobId] = useState(initialJobId);
  const [editorMode, setEditorMode] = useState<QuoteEditorMode>("guided");
  const [customers, setCustomers] = useState(initialCustomers);
  const [error, setError] = useState<string | null>(null);
  const [quoteId, setQuoteId] = useState(quote?.id ?? "");
  const [status, setStatus] = useState(quote?.status ?? "draft");

  const [quoteName, setQuoteName] = useState(quote?.name ?? "");
  const [jobType, setJobType] = useState<QuoteJobType>(
    quote?.job_type ?? "interior",
  );
  const [estimationMode, setEstimationMode] = useState<QuoteEstimationMode>(
    quote?.estimation_mode ?? "hybrid",
  );
  const [customMessage, setCustomMessage] = useState(
    quote?.custom_message ?? "",
  );

  const [customerId, setCustomerId] = useState(quote?.customer_id ?? "");
  const [jobAddress, setJobAddress] = useState<JobAddressFields>(() => ({
    job_address: quote?.job_address ?? "",
    job_address_line2: quote?.job_address_line2 ?? "",
    job_city: quote?.job_city ?? "",
    job_state: quote?.job_state ?? "",
    job_zip: quote?.job_zip ?? "",
  }));
  const [beforePhotos, setBeforePhotos] = useState<string[]>(
    quote?.before_photos ?? [],
  );

  const sortedInitialRooms = useMemo(
    () => sortRoomsByOrder(initialRooms),
    [initialRooms],
  );

  const [rooms, setRooms] = useState<RoomInput[]>(() =>
    sortedInitialRooms.map(mapRoomToInput),
  );
  const [surfaces, setSurfaces] = useState<SurfaceInput[]>(() =>
    initialSurfaces.map((surface) =>
      mapSurfaceToInput(surface, sortedInitialRooms),
    ),
  );
  const [lineItems, setLineItems] = useState<LineItemInput[]>(() =>
    initialLineItems.map((item, index) =>
      mapLineItemToInput(item, index, sortedInitialRooms),
    ),
  );

  const [tierPaintConfig, setTierPaintConfig] = useState<
    Record<string, TierPaintConfigInput>
  >(() => {
    const state = defaultTierPaintState();
    for (const row of initialTierPaintConfig) {
      if (QUOTE_PAINT_TIERS.includes(row.tier)) {
        state[row.tier] = row;
      }
    }
    return state;
  });
  const [paintProducts, setPaintProducts] = useState<CompanyPaintProductRow[]>(
    [],
  );
  const [paintPresets, setPaintPresets] = useState<CompanyPaintPresetRow[]>(
    [],
  );

  const pricingSummary = useMemo(
    () => getCompanyPricingSummary(company),
    [company],
  );

  const pricedLineItems = useMemo(
    () =>
      lineItems.map((item, i) => ({
        id: item.id ?? `temp-${i}`,
        quote_id: quoteId,
        type: item.type,
        description: item.description,
        qty: item.qty,
        unit_cost: item.unit_cost,
        markup: item.markup,
        source: (item.source ?? "manual") as QuoteLineItemSource,
        room_id: item.room_id ?? null,
        is_optional: item.is_optional ?? false,
        sort_order: item.sort_order ?? i,
        company_paint_product_id: item.company_paint_product_id ?? null,
        paint_role: item.paint_role ?? null,
      })),
    [lineItems, quoteId],
  );

  const subtotal = useMemo(
    () =>
      lineItemsSubtotal(pricedLineItems, { excludeOptional: true }),
    [pricedLineItems],
  );

  const quoteTotals = useMemo(
    () => calculateQuoteTotals(subtotal, company),
    [subtotal, company],
  );

  const tierBase = quoteTotals.beforeTax;

  const paintableSqFt = useMemo(
    () => computePaintableSqFt(surfaces, rooms),
    [surfaces, rooms],
  );

  const tierAdjustments = useMemo(
    () =>
      computeTierAdjustments(
        tierPaintConfig,
        paintProducts,
        paintableSqFt,
        company,
      ),
    [tierPaintConfig, paintProducts, paintableSqFt, company],
  );

  const autoTierPrices = useMemo(
    () =>
      calculateTierPrices(
        tierBase,
        upgradeRules,
        company.default_margins as Record<string, number>,
        tierAdjustments,
      ),
    [tierBase, upgradeRules, company.default_margins, tierAdjustments],
  );

  const [tierState, setTierState] = useState<Record<QuoteTierName, TierInput>>(
    () => {
      const state = {} as Record<QuoteTierName, TierInput>;
      TIER_NAMES.forEach((tier) => {
        const existing = initialTiers.find((t) => t.tier === tier);
        const auto = autoTierPrices[tier];
        state[tier] = {
          tier,
          price: existing?.price ?? auto.price,
          margin: existing?.margin ?? auto.margin,
          features: existing?.features?.length
            ? existing.features
            : TIER_DEFAULTS[tier as keyof typeof TIER_DEFAULTS].features,
          benefits: existing?.benefits?.length
            ? existing.benefits
            : TIER_DEFAULTS[tier as keyof typeof TIER_DEFAULTS].benefits,
        };
      });
      return state;
    },
  );

  const prevTierBaseRef = useRef(tierBase);
  const prevAutoTierPricesRef = useRef(autoTierPrices);

  useEffect(() => {
    if (prevTierBaseRef.current === tierBase) return;

    setTierState((prev) => {
      const next = { ...prev };
      TIER_NAMES.forEach((tier) => {
        const previousAuto = prevAutoTierPricesRef.current[tier];
        if (prev[tier].price === previousAuto.price) {
          next[tier] = {
            ...next[tier],
            price: autoTierPrices[tier].price,
            margin: autoTierPrices[tier].margin,
          };
        }
      });
      return next;
    });

    prevTierBaseRef.current = tierBase;
    prevAutoTierPricesRef.current = autoTierPrices;
  }, [tierBase, autoTierPrices]);

  const [selectedAreaIndex, setSelectedAreaIndex] = useState(0);
  const [roomDrawerOpen, setRoomDrawerOpen] = useState(false);
  const [lineItemDrawerOpen, setLineItemDrawerOpen] = useState(false);
  const [editingRoomIndex, setEditingRoomIndex] = useState<number | null>(null);
  const [editingLineItemIndex, setEditingLineItemIndex] = useState<
    number | null
  >(null);
  const [roomDraft, setRoomDraft] = useState<RoomInput>(EMPTY_ROOM);
  const [lineItemDraft, setLineItemDraft] =
    useState<LineItemInput>(EMPTY_LINE_ITEM);

  const coverage = DEFAULT_PRODUCT_COVERAGE_SQFT_PER_GALLON;
  const stepIndex = QUOTE_STEPS.indexOf(step);

  useEffect(() => {
    setEditorMode(getStoredEditorMode());
  }, []);

  const navigateToStep = useCallback(
    (
      target: QuoteStep,
      options?: { advanceMax?: boolean; replaceUrl?: boolean },
    ) => {
      let resolved = target;
      if (editorMode === "guided" && resolved === "line-items") {
        resolved = "tiers";
      }
      const targetIndex = QUOTE_STEPS.indexOf(resolved);
      if (editorMode === "guided" && targetIndex > maxReachedIndex) {
        return;
      }
      setStep(resolved);
      if (options?.advanceMax !== false) {
        setMaxReachedIndex((prev) => Math.max(prev, targetIndex));
      }
      if (quoteId && options?.replaceUrl !== false) {
        const path =
          workspaceMode === "modal"
            ? `/app/quotes?workspace=${quoteId}&step=${resolved}`
            : `/app/quotes/${quoteId}?step=${resolved}`;
        router.replace(path, { scroll: false });
      }
    },
    [editorMode, maxReachedIndex, quoteId, router, workspaceMode],
  );

  useEffect(() => {
    if (editorMode === "guided" && step === "line-items") {
      navigateToStep("tiers", { advanceMax: false });
    }
  }, [editorMode, step, navigateToStep]);

  const handleEditorModeChange = (mode: QuoteEditorMode) => {
    setEditorMode(mode);
    setStoredEditorMode(mode);
    if (mode === "guided" && step === "line-items") {
      navigateToStep("tiers", { advanceMax: false });
    }
  };

  const isEditable = status === "draft";

  const syncChildrenFromServer = useCallback(async (id: string) => {
    const result = await fetchQuoteChildren(id);
    if (!result.success) return;

    const orderedRooms = sortRoomsByOrder(result.data.rooms);
    setRooms(orderedRooms.map(mapRoomToInput));
    setSurfaces(
      result.data.surfaces.map((surface) =>
        mapSurfaceToInput(surface, orderedRooms),
      ),
    );
    setLineItems(
      result.data.lineItems.map((item, index) =>
        mapLineItemToInput(item, index, orderedRooms),
      ),
    );
  }, []);

  useEffect(() => {
    if (!rooms.length) {
      setSelectedAreaIndex(0);
      return;
    }
    if (selectedAreaIndex > rooms.length - 1) {
      setSelectedAreaIndex(rooms.length - 1);
    }
  }, [rooms.length, selectedAreaIndex]);

  const goodTierPaint = useMemo(() => {
    const productsById = buildProductsMap(paintProducts);
    return resolveTierPaintConfig(tierPaintConfig.good, productsById);
  }, [tierPaintConfig.good, paintProducts]);

  const productsById = useMemo(
    () => buildProductsMap(paintProducts),
    [paintProducts],
  );

  const estimateContext = useMemo(
    () => ({
      company,
      rooms,
      surfaces,
      manualItems: [] as LineItemInput[],
      estimationMode,
      jobType,
      goodTierPaint: goodTierPaint.topcoat ? goodTierPaint : null,
      productsById,
    }),
    [company, jobType, rooms, surfaces, estimationMode, goodTierPaint, productsById],
  );

  useEffect(() => {
    void listCompanyPaintProducts(quoteId || undefined).then((result) => {
      if (result.success) setPaintProducts(result.data);
    });
    void listPaintPresets().then((result) => {
      if (result.success) setPaintPresets(result.data);
    });
  }, [quoteId]);

  const goToStep = useCallback(
    (target: QuoteStep) => {
      navigateToStep(target);
    },
    [navigateToStep],
  );

  const advanceMaxReached = (nextStep: QuoteStep) => {
    const nextIndex = QUOTE_STEPS.indexOf(nextStep);
    setMaxReachedIndex((prev) => Math.max(prev, nextIndex));
  };

  const costBreakdown = useMemo(() => {
    let laborTotal = 0;
    let materialsTotal = 0;
    for (const item of pricedLineItems) {
      if (item.is_optional) continue;
      const lineTotal =
        item.qty * item.unit_cost * (1 + (item.markup ?? 0) / 100);
      if (item.type === "labor") laborTotal += lineTotal;
      else materialsTotal += lineTotal;
    }
    const featuredTier = tierState.better.price > 0 ? "better" : "good";
    const tierPrice = tierState[featuredTier].price;
    const profitPct =
      tierPrice > 0
        ? tierState[featuredTier].margin
        : quoteTotals.beforeTax > 0
          ? Math.round(
              ((quoteTotals.beforeTax - subtotal) / quoteTotals.beforeTax) * 1000,
            ) / 10
          : 0;
    return {
      laborTotal,
      materialsTotal,
      profitPct,
      featuredTierLabel: TIER_LABELS[featuredTier],
      displayTotal:
        tierPrice > 0 ? tierPrice : quoteTotals.beforeTax || subtotal,
    };
  }, [pricedLineItems, tierState, quoteTotals.beforeTax, subtotal]);

  const getDraft = useCallback((): QuoteDraftInput => {
    return {
      header: {
        customer_id: customerId,
        name: quoteName || null,
        job_type: jobType,
        estimation_mode: estimationMode,
        custom_message: customMessage || null,
        ...jobAddress,
        job_address: jobAddress.job_address.trim(),
        before_photos: beforePhotos,
      },
      rooms,
      surfaces,
      lineItems,
      tiers: TIER_NAMES.map((tier) => tierState[tier]),
      tierPaintConfig: QUOTE_PAINT_TIERS.map((tier) => tierPaintConfig[tier]),
    };
  }, [
    customerId,
    quoteName,
    jobType,
    estimationMode,
    customMessage,
    jobAddress,
    beforePhotos,
    rooms,
    surfaces,
    lineItems,
    tierState,
    tierPaintConfig,
  ]);

  const ensureQuote = useCallback(async (): Promise<string | null> => {
    if (quoteId) return quoteId;
    if (!customerId || !hasMinimumJobAddress(jobAddress)) {
      setError(
        "Select a customer and enter the full job address (street, city, state, ZIP).",
      );
      return null;
    }

    const result = await createQuote({
      customer_id: customerId,
      name: quoteName.trim() || null,
      job_type: jobType,
      estimation_mode: estimationMode,
      ...jobAddress,
      job_address: jobAddress.job_address.trim(),
      before_photos: beforePhotos,
    });

    if (!result.success) {
      setError(result.error);
      return null;
    }

    setQuoteId(result.data.id);
    router.replace(`/app/quotes/${result.data.id}?step=${step}`, {
      scroll: false,
    });
    return result.data.id;
  }, [
    quoteId,
    customerId,
    jobAddress,
    beforePhotos,
    quoteName,
    jobType,
    estimationMode,
    router,
    step,
  ]);

  const saveSetup = async () => {
    setError(null);
    const id = await ensureQuote();
    if (!id) return false;

    const result = await updateQuote(id, {
      customer_id: customerId,
      name: quoteName || null,
      job_type: jobType,
      estimation_mode: estimationMode,
      custom_message: customMessage || null,
      ...jobAddress,
      job_address: jobAddress.job_address.trim(),
      before_photos: beforePhotos,
    });

    if (!result.success) {
      setError(result.error);
      return false;
    }
    return true;
  };

  const saveCurrentDraft = useCallback(
    async (id: string) => {
      const snapshot = serializeQuoteDraftForCompare(getDraft());
      return enqueueQuoteSave(async () => {
        const result = await saveQuoteDraft(id, getDraft());
        if (
          result.success &&
          serializeQuoteDraftForCompare(getDraft()) === snapshot
        ) {
          await syncChildrenFromServer(id);
        }
        return result;
      });
    },
    [getDraft, syncChildrenFromServer],
  );

  const saveDraftNow = useCallback(async (): Promise<boolean> => {
    if (!isEditable) {
      setError("Revise this quote to draft before saving changes.");
      return false;
    }
    setError(null);
    const id = await ensureQuote();
    if (!id) return false;
    const result = await saveCurrentDraft(id);
    if (!result.success) {
      setError(result.error);
      toast.error(result.error);
      return false;
    }
    toast.success("Draft saved");
    return true;
  }, [ensureQuote, saveCurrentDraft, isEditable]);

  const handleNext = () => {
    startTransition(async () => {
      setError(null);
      if (!isEditable) {
        setError("Revise this quote to draft before continuing.");
        return;
      }
      if (step === "setup") {
        const ok = await saveSetup();
        if (!ok) return;
        const next = getAdjacentStep("setup", "next", editorMode);
        if (next) {
          advanceMaxReached(next);
          navigateToStep(next);
        }
        return;
      }

      const id = await ensureQuote();
      if (!id) return;

      if (step === "paint-options" && !isPaintConfigComplete(tierPaintConfig)) {
        const message =
          "Select a topcoat for the Good tier before continuing.";
        setError(message);
        toast.error(message);
        return;
      }

      let draft = getDraft();
      if (
        (step === "estimator" || step === "paint-options") &&
        estimationMode !== "manual"
      ) {
        const manualOnly = lineItems.filter(
          (item) => item.source === "manual" || !item.source,
        );
        const generated = regenerateLineItems(
          { ...estimateContext, manualItems: manualOnly },
          lineItems,
        );
        setLineItems(generated);
        draft = { ...draft, lineItems: generated };

        if (step === "paint-options") {
          const productsById = buildProductsMap(paintProducts);
          setTierState((prev) => {
            const next = { ...prev };
            for (const tier of QUOTE_PAINT_TIERS) {
              const resolved = resolveTierPaintConfig(
                tierPaintConfig[tier],
                productsById,
              );
              const features = collectTierFeatures(resolved);
              if (features.length) {
                next[tier] = { ...next[tier], features };
              }
            }
            return next;
          });
        }
      }

      const snapshot = serializeQuoteDraftForCompare(draft);
      const result = await enqueueQuoteSave(async () => {
        const saveResult = await saveQuoteDraft(id, draft);
        if (
          saveResult.success &&
          serializeQuoteDraftForCompare(getDraft()) === snapshot
        ) {
          await syncChildrenFromServer(id);
        }
        return saveResult;
      });
      if (!result.success) {
        setError(result.error);
        return;
      }

      const next = getAdjacentStep(step, "next", editorMode);
      if (next) {
        advanceMaxReached(next);
        navigateToStep(next);
      }
    });
  };

  const addCustomer = (customer: Customer) => {
    setCustomers((prev) =>
      [...prev, customer].sort((a, b) => a.name.localeCompare(b.name)),
    );
  };

  const handleBack = () => {
    const prev = getAdjacentStep(step, "back", editorMode);
    if (prev) {
      navigateToStep(prev, { advanceMax: false });
    }
  };

  const openRoomDrawer = (index: number | null = null) => {
    if (index !== null) {
      setRoomDraft(rooms[index]);
      setEditingRoomIndex(index);
    } else {
      setRoomDraft({ ...EMPTY_ROOM, sort_order: rooms.length });
      setEditingRoomIndex(null);
    }
    setRoomDrawerOpen(true);
  };

  const saveRoomDraft = () => {
    if (!roomDraft.name.trim()) {
      toast.error("Room name is required.");
      return;
    }
    if (editingRoomIndex !== null) {
      setRooms((prev) =>
        prev.map((room, i) => (i === editingRoomIndex ? roomDraft : room)),
      );
      setSelectedAreaIndex(editingRoomIndex);
    } else {
      const newIndex = rooms.length;
      setRooms((prev) => [...prev, { ...roomDraft, sort_order: newIndex }]);
      setSelectedAreaIndex(newIndex);
    }
    setRoomDrawerOpen(false);
  };

  const addAreaByName = (name: string) => {
    const newIndex = rooms.length;
    const room: RoomInput = {
      ...EMPTY_ROOM,
      name,
      sort_order: newIndex,
    };
    setRooms((prev) => [...prev, room]);
    setSelectedAreaIndex(newIndex);
  };

  const updateArea = (index: number, patch: Partial<RoomInput>) => {
    setRooms((prev) =>
      prev.map((room, i) => (i === index ? { ...room, ...patch } : room)),
    );
  };

  const deleteArea = (index: number) => {
    const map = buildIndexMapAfterDelete(rooms.length, index);
    setRooms((prev) =>
      prev
        .filter((_, i) => i !== index)
        .map((room, i) => ({ ...room, sort_order: i })),
    );
    setSurfaces((prev) =>
      remapRoomIndices(
        prev.filter((surface) => surface.room_index !== index),
        map,
      ),
    );
    setLineItems((prev) =>
      remapRoomIndices(
        prev.filter(
          (item) => item.room_index !== index && item.room_id !== rooms[index]?.id,
        ),
        map,
      ),
    );
    setSelectedAreaIndex((current) => {
      if (current === index) return Math.max(0, index - 1);
      if (current > index) return current - 1;
      return current;
    });
  };

  const reorderAreas = (fromIndex: number, toIndex: number) => {
    if (fromIndex === toIndex) return;
    const map = buildIndexMapAfterReorder(rooms.length, fromIndex, toIndex);
    setRooms((prev) =>
      arrayMove([...prev], fromIndex, toIndex).map((room, i) => ({
        ...room,
        sort_order: i,
      })),
    );
    setSurfaces((prev) => remapRoomIndices(prev, map));
    setLineItems((prev) => remapRoomIndices(prev, map));
    setSelectedAreaIndex((current) => map.get(current) ?? current);
  };

  const duplicateArea = (index: number) => {
    const source = rooms[index];
    if (!source) return;
    const newIndex = rooms.length;
    setRooms((prev) => [
      ...prev,
      {
        ...source,
        id: undefined,
        name: `${source.name} copy`,
        sort_order: newIndex,
      },
    ]);
    const sourceSurfaces = surfaces.filter(
      (surface) => surface.room_index === index,
    );
    if (sourceSurfaces.length) {
      setSurfaces((prev) => [
        ...prev,
        ...sourceSurfaces.map((surface, sort_order) => ({
          ...surface,
          id: undefined,
          room_id: undefined,
          room_index: newIndex,
          sort_order,
        })),
      ]);
    }
    setSelectedAreaIndex(newIndex);
    toast.success("Area duplicated — tweak dimensions as needed.");
  };

  const bulkDeleteAreas = (indices: number[]) => {
    const unique = [...new Set(indices)].sort((a, b) => a - b);
    if (!unique.length) return;
    const toDelete = new Set(unique);
    const map = buildIndexMapAfterBulkDelete(rooms.length, unique);
    const deletedRoomIds = new Set(
      unique.map((index) => rooms[index]?.id).filter(Boolean) as string[],
    );

    setRooms((prev) =>
      prev
        .filter((_, index) => !toDelete.has(index))
        .map((room, index) => ({ ...room, sort_order: index })),
    );
    setSurfaces((prev) =>
      remapRoomIndices(
        prev.filter(
          (surface) =>
            surface.room_index === undefined || !toDelete.has(surface.room_index),
        ),
        map,
      ),
    );
    setLineItems((prev) =>
      remapRoomIndices(
        prev.filter((item) => {
          if (
            item.room_index !== undefined &&
            toDelete.has(item.room_index)
          ) {
            return false;
          }
          if (item.room_id && deletedRoomIds.has(item.room_id)) return false;
          return true;
        }),
        map,
      ),
    );
    setSelectedAreaIndex((current) => {
      if (toDelete.has(current)) {
        const remaining = rooms
          .map((_, index) => index)
          .filter((index) => !toDelete.has(index));
        return remaining.length ? (map.get(remaining[0]) ?? 0) : 0;
      }
      return map.get(current) ?? 0;
    });
    toast.success(
      `Deleted ${unique.length} area${unique.length === 1 ? "" : "s"}`,
    );
  };

  const bulkDuplicateAreas = (indices: number[]) => {
    const unique = [...new Set(indices)].sort((a, b) => a - b);
    if (!unique.length) return;

    const roomAdditions: RoomInput[] = [];
    const surfaceAdditions: SurfaceInput[] = [];
    let nextRoomIndex = rooms.length;

    for (const sourceIndex of unique) {
      const source = rooms[sourceIndex];
      if (!source) continue;
      roomAdditions.push({
        ...source,
        id: undefined,
        name: `${source.name} copy`,
        sort_order: nextRoomIndex,
      });
      const sourceSurfaces = surfaces.filter(
        (surface) => surface.room_index === sourceIndex,
      );
      sourceSurfaces.forEach((surface, sort_order) => {
        surfaceAdditions.push({
          ...surface,
          id: undefined,
          room_id: undefined,
          room_index: nextRoomIndex,
          sort_order,
        });
      });
      nextRoomIndex += 1;
    }

    if (!roomAdditions.length) return;

    setRooms((prev) => [...prev, ...roomAdditions]);
    if (surfaceAdditions.length) {
      setSurfaces((prev) => [...prev, ...surfaceAdditions]);
    }
    setSelectedAreaIndex(rooms.length + roomAdditions.length - 1);
    toast.success(
      `Duplicated ${roomAdditions.length} area${roomAdditions.length === 1 ? "" : "s"}`,
    );
  };

  const bulkSetAreasOptional = (indices: number[], isOptional: boolean) => {
    const selected = new Set(indices);
    if (!selected.size) return;
    setRooms((prev) =>
      prev.map((room, index) =>
        selected.has(index) ? { ...room, is_optional: isOptional } : room,
      ),
    );
    toast.success(
      isOptional
        ? `Marked ${selected.size} area${selected.size === 1 ? "" : "s"} optional`
        : `Marked ${selected.size} area${selected.size === 1 ? "" : "s"} required`,
    );
  };

  const applyWallDimensions = (index: number) => {
    const room = rooms[index];
    if (!room) return;
    const sqFt = wallSqFtFromDimensions(
      room.length_ft ?? 0,
      room.width_ft ?? 0,
      room.height_ft ?? 0,
    );
    if (sqFt > 0) updateArea(index, { sq_ft: sqFt });
  };

  const addSurfaceToArea = (
    roomIndex: number,
    surfaceType: QuoteSurfaceKind,
    rateType: QuoteRateType = "sqft",
  ) => {
    const painterRate =
      (company.labor_rates as Record<string, number>).painter ?? 45;
    const defaultUnitRate =
      rateType === "each" ? 75 : rateType === "linear" ? 1.5 : painterRate;
    const areaSurfaceCount = surfaces.filter(
      (surface) => surface.room_index === roomIndex,
    ).length;
    setSurfaces((prev) => [
      ...prev,
      {
        surface_type: surfaceType,
        sq_ft: 0,
        coats: 2,
        unit_rate: defaultUnitRate,
        rate_type: rateType,
        room_index: roomIndex,
        room_id: rooms[roomIndex]?.id,
        is_optional: false,
        sort_order: areaSurfaceCount,
        notes: null,
      },
    ]);
  };

  const updateSurfaceAt = (
    surfaceKey: number,
    patch: Partial<SurfaceInput>,
  ) => {
    setSurfaces((prev) =>
      prev.map((surface, i) =>
        i === surfaceKey ? { ...surface, ...patch } : surface,
      ),
    );
  };

  const removeSurfaceAt = (surfaceKey: number) => {
    setSurfaces((prev) => prev.filter((_, i) => i !== surfaceKey));
  };

  const openLineItemForArea = (roomIndex: number | null = null) => {
    setLineItemDraft({
      ...EMPTY_LINE_ITEM,
      markup: 0,
      sort_order: lineItems.length,
      source: "manual",
      room_index: roomIndex ?? undefined,
      room_id: roomIndex !== null ? rooms[roomIndex]?.id ?? null : null,
    });
    setEditingLineItemIndex(null);
    setLineItemDrawerOpen(true);
  };

  const defaultGrossMarginPct = useMemo(
    () =>
      readDefaultGrossMarginPct(
        company.default_margins as Record<string, number> | null,
      ),
    [company.default_margins],
  );

  const [projectGrossMarginPct, setProjectGrossMarginPct] = useState(
    defaultGrossMarginPct,
  );

  useEffect(() => {
    setProjectGrossMarginPct(defaultGrossMarginPct);
  }, [defaultGrossMarginPct]);

  const areaPricingOptions = useMemo(
    () => ({
      lineItems,
      grossMarginPct: projectGrossMarginPct,
    }),
    [lineItems, projectGrossMarginPct],
  );

  const areaCostBreakdowns = useMemo(
    () =>
      rooms.map((_, index) =>
        computeAreaCostBreakdown(index, estimateContext, areaPricingOptions),
      ),
    [rooms, estimateContext, areaPricingOptions],
  );

  const areaSubtotals = useMemo(
    () => areaCostBreakdowns.map((breakdown) => breakdown.bidPrice),
    [areaCostBreakdowns],
  );

  const globalManualLineItems = useMemo(
    () =>
      lineItems
        .map((item, index) => ({ item, index }))
        .filter(
          ({ item }) =>
            item.source === "manual" &&
            item.room_index === undefined &&
            !item.room_id,
        ),
    [lineItems],
  );

  const lineItemsForSelectedArea = useMemo(() => {
    if (!rooms.length) return [];
    return lineItems.filter(
      (item) =>
        item.room_index === selectedAreaIndex ||
        item.room_id === rooms[selectedAreaIndex]?.id,
    );
  }, [lineItems, rooms, selectedAreaIndex]);

  const surfacesForSelectedArea = useMemo(
    () =>
      surfaces
        .map((surface, index) => ({ surface, index }))
        .filter(({ surface }) => surface.room_index === selectedAreaIndex),
    [surfaces, selectedAreaIndex],
  );

  const openLineItemDrawer = (index: number | null = null) => {
    if (index !== null) {
      setLineItemDraft(lineItems[index]);
      setEditingLineItemIndex(index);
    } else {
      setLineItemDraft({
        ...EMPTY_LINE_ITEM,
        markup: 0,
        sort_order: lineItems.length,
      });
      setEditingLineItemIndex(null);
    }
    setLineItemDrawerOpen(true);
  };

  const regenerateArea = (roomIndex: number) => {
    const newItems = buildLineItemsForArea(roomIndex, {
      ...estimateContext,
      manualItems: [],
    }).map((item) => ({
      ...item,
      room_index: roomIndex,
      room_id: rooms[roomIndex]?.id ?? null,
    }));

    setLineItems((prev) => {
      const kept = prev.filter((item) => {
        const linked =
          item.room_index === roomIndex ||
          item.room_id === rooms[roomIndex]?.id;
        if (!linked) return true;
        return item.source === "manual";
      });
      return [...kept, ...newItems];
    });
    toast.success("Area line items updated.");
  };

  const generateFromRooms = () => {
    if (!rooms.length && !surfaces.length) {
      setError("Add areas or surfaces before generating line items.");
      return;
    }

    setLineItems(
      regenerateLineItems(
        {
          ...estimateContext,
          manualItems: lineItems.filter(
            (item) => item.source === "manual" || !item.source,
          ),
        },
        lineItems,
      ),
    );
    setError(null);
  };

  const saveLineItemDraft = () => {
    if (!lineItemDraft.description.trim()) {
      toast.error("Line item description is required.");
      return;
    }
    const item = { ...lineItemDraft, source: "manual" as const };
    if (editingLineItemIndex !== null) {
      setLineItems((prev) =>
        prev.map((existing, i) =>
          i === editingLineItemIndex ? item : existing,
        ),
      );
    } else {
      setLineItems((prev) => [...prev, item]);
    }
    setLineItemDrawerOpen(false);
  };

  const addOptionalPreset = (preset: OptionPreset) => {
    setLineItems((prev) => [
      ...prev,
      {
        type: preset.type,
        description: `${preset.label} — ${preset.description}`,
        qty: preset.qty,
        unit_cost: preset.unit_cost,
        markup: preset.markup,
        source: "manual",
        is_optional: true,
        sort_order: prev.length,
        room_id: null,
        company_paint_product_id: null,
        paint_role: null,
      },
    ]);
  };

  const toggleLineItemOptional = (index: number) => {
    setLineItems((prev) =>
      prev.map((item, i) =>
        i === index ? { ...item, is_optional: !item.is_optional } : item,
      ),
    );
  };

  const removeLineItemAt = (index: number) => {
    setLineItems((prev) => prev.filter((_, i) => i !== index));
  };

  const updateTier = (tier: QuoteTierName, patch: Partial<TierInput>) => {
    setTierState((prev) => ({
      ...prev,
      [tier]: { ...prev[tier], ...patch },
    }));
  };

  const updateTierPaint = (
    tier: TierPaintConfigInput["tier"],
    patch: Partial<TierPaintConfigInput>,
  ) => {
    setTierPaintConfig((prev) => ({
      ...prev,
      [tier]: { ...prev[tier], ...patch },
    }));
  };

  const applyPaintPreset = (
    tier: TierPaintConfigInput["tier"],
    presetId: string,
  ) => {
    const preset = paintPresets.find((p) => p.id === presetId);
    if (!preset) return;
    updateTierPaint(tier, {
      primer_product_id: preset.primer_product_id,
      topcoat_product_id: preset.topcoat_product_id,
      primer_coats: preset.primer_coats,
      topcoat_coats: preset.topcoat_coats,
      labor_hours_delta_pct: preset.labor_hours_delta_pct,
      labor_hours_delta_hours: preset.labor_hours_delta_hours,
      prep_hours_delta: preset.prep_hours_delta,
      value_add_features: preset.value_add_features,
    });
  };

  const applyCompanyPaintDefaults = async () => {
    const result = await fetchCompanyTierDefaults();
    if (!result.success) {
      toast.error(result.error);
      return;
    }
    setTierPaintConfig((prev) => {
      const next = { ...prev };
      for (const config of result.data) {
        next[config.tier] = config;
      }
      return next;
    });
    toast.success("Company defaults applied");
  };

  const openCustomOptionalItem = () => {
    setLineItemDraft({
      ...EMPTY_LINE_ITEM,
      markup: 0,
      sort_order: lineItems.length,
      source: "manual",
      is_optional: true,
      room_id: null,
    });
    setEditingLineItemIndex(null);
    setLineItemDrawerOpen(true);
  };

  const applyAutoPricing = () => {
    setTierState((prev) => {
      const next = { ...prev };
      TIER_NAMES.forEach((tier) => {
        next[tier] = {
          ...next[tier],
          price: autoTierPrices[tier].price,
          margin: autoTierPrices[tier].margin,
        };
      });
      return next;
    });
  };

  const handleSendQuote = () => {
    startTransition(async () => {
      setError(null);
      const id = await ensureQuote();
      if (!id) return;

      const selectedCustomer = customers.find((c) => c.id === customerId);
      if (!selectedCustomer?.email) {
        setError("Add an email address to the customer before sending.");
        return;
      }

      const hasPricedTier = TIER_NAMES.some(
        (tier) => tierState[tier].price > 0,
      );
      if (!hasPricedTier) {
        setError("Set at least one tier price before sending.");
        return;
      }

      const saveResult = await saveCurrentDraft(id);
      if (!saveResult.success) {
        setError(saveResult.error);
        return;
      }

      const result = await sendQuote(id);
      if (!result.success) {
        setError(result.error);
        return;
      }
      setStatus("sent");
      toast.success("Quote sent to customer.");
    });
  };

  const selectedCustomer = customers.find((c) => c.id === customerId);

  const portalUrl =
    quoteId && company.slug && selectedCustomer?.portal_token
      ? `${typeof window !== "undefined" ? window.location.origin : ""}/${company.slug}/quotes/${quoteId}?portal_token=${selectedCustomer.portal_token}`
      : null;

  const handleCopyPortalLink = async () => {
    if (!portalUrl) {
      toast.error("Save the quote and select a customer first.");
      return;
    }

    try {
      await navigator.clipboard.writeText(portalUrl);
      toast.success("Customer portal link copied.");
    } catch {
      toast.error("Could not copy link.");
    }
  };

  const handleDuplicateQuote = () => {
    if (!quoteId) return;

    startTransition(async () => {
      const result = await duplicateQuote(quoteId);
      if (!result.success) {
        setError(result.error);
        toast.error(result.error ?? "Failed to duplicate quote.");
        return;
      }

      toast.success("Quote duplicated.");
      router.push(`/app/quotes/${result.data!.id}?step=estimator`);
    });
  };

  const handleReviseToDraft = () => {
    if (!quoteId) return;

    startTransition(async () => {
      const result = await reviseQuoteToDraft(quoteId);
      if (!result.success) {
        setError(result.error);
        toast.error(result.error);
        return;
      }
      setStatus("draft");
      setMaxReachedIndex(QUOTE_STEPS.indexOf("review"));
      navigateToStep("estimator");
      toast.success("Quote reopened as draft — make changes and resend.");
    });
  };

  const handleResendQuote = () => {
    if (!quoteId) return;

    startTransition(async () => {
      setError(null);
      const selectedCustomer = customers.find((c) => c.id === customerId);
      if (!selectedCustomer?.email) {
        setError("Add an email address to the customer before sending.");
        return;
      }

      const saveResult = await saveCurrentDraft(quoteId);
      if (!saveResult.success) {
        setError(saveResult.error);
        return;
      }

      const result = await resendQuote(quoteId);
      if (!result.success) {
        setError(result.error);
        toast.error(result.error);
        return;
      }
      setStatus("sent");
      toast.success("Quote resent to customer.");
    });
  };

  const totalGallons = rooms.reduce(
    (sum, room) => sum + estimateGallons(room.sq_ft, room.coats, coverage),
    0,
  );

  return {
    mode,
    isEditable,
    step,
    setStep,
    goToStep,
    stepIndex,
    maxReachedIndex,
    editorMode,
    handleEditorModeChange,
    costBreakdown,
    addCustomer,
    error,
    setError,
    isPending,
    quoteId,
    status,
    quoteName,
    setQuoteName,
    jobType,
    setJobType,
    estimationMode,
    setEstimationMode,
    customMessage,
    setCustomMessage,
    customerId,
    setCustomerId,
    jobAddress,
    setJobAddress,
    beforePhotos,
    setBeforePhotos,
    rooms,
    setRooms,
    selectedAreaIndex,
    setSelectedAreaIndex,
    areaSubtotals,
    areaCostBreakdowns,
    projectGrossMarginPct,
    setProjectGrossMarginPct,
    surfaces,
    setSurfaces,
    surfacesForSelectedArea,
    lineItemsForSelectedArea,
    globalManualLineItems,
    addAreaByName,
    updateArea,
    deleteArea,
    reorderAreas,
    duplicateArea,
    bulkDeleteAreas,
    bulkDuplicateAreas,
    bulkSetAreasOptional,
    applyWallDimensions,
    addSurfaceToArea,
    updateSurfaceAt,
    removeSurfaceAt,
    openLineItemForArea,
    regenerateArea,
    lineItems,
    setLineItems,
    tierState,
    setTierState,
    pricingSummary,
    subtotal,
    quoteTotals,
    tierBase,
    autoTierPrices,
    roomDrawerOpen,
    setRoomDrawerOpen,
    lineItemDrawerOpen,
    setLineItemDrawerOpen,
    editingRoomIndex,
    editingLineItemIndex,
    roomDraft,
    setRoomDraft,
    lineItemDraft,
    setLineItemDraft,
    coverage,
    totalGallons,
    selectedCustomer,
    portalUrl,
    customers,
    company,
    getDraft,
    saveDraftNow,
    syncChildrenFromServer,
    handleNext,
    handleBack,
    openRoomDrawer,
    saveRoomDraft,
    openLineItemDrawer,
    generateFromRooms,
    saveLineItemDraft,
    applyAutoPricing,
    addOptionalPreset,
    toggleLineItemOptional,
    removeLineItemAt,
    updateTier,
    tierPaintConfig,
    paintProducts,
    paintPresets,
    paintableSqFt,
    updateTierPaint,
    applyPaintPreset,
    applyCompanyPaintDefaults,
    openCustomOptionalItem,
    handleSendQuote,
    handleCopyPortalLink,
    handleDuplicateQuote,
    handleReviseToDraft,
    handleResendQuote,
    jobId,
    parseLines,
    joinLines,
  };
}