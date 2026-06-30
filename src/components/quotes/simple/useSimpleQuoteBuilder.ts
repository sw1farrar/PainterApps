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
  saveQuoteDraft,
  sendQuote,
  updateQuote,
  type LineItemInput,
  type QuoteDraftInput,
  type TierInput,
} from "@/app/app/(portal)/quotes/actions";
import { useSimpleQuoteAreas } from "@/components/quotes/simple/useSimpleQuoteAreas";
import { hasMinimumJobAddress, type JobAddressFields } from "@/lib/address";
import {
  defaultTierPaintState,
  isQuotePaintTier,
  QUOTE_PAINT_TIERS,
  resolveTierPaintConfig,
  type CompanyPaintProductRow,
  type QuotePaintTier,
  type TierPaintConfigInput,
} from "@/lib/paint-library/types";
import {
  baselineSystemsToPaintDefaults,
  emptyBaselinePaintSystems,
  goodTierPaintFromBaseline,
  isBaselineConfigured,
  normalizeBaselinePaintSystems,
  type BaselinePaintSystemInput,
} from "@/lib/quotes/baseline-paint";
import {
  baselineSystemsForQuoteJob,
  readDefaultGrossMarginPct,
  tierDefaultsForJobType,
  type CompanyEstimateDefaults,
} from "@/lib/quotes/company-estimate-defaults";
import { enqueueQuoteSave } from "@/lib/quotes/save-coordinator";
import { suggestQuotePriceFromLineItems } from "@/lib/quotes/suggested-quote-price";
import {
  defaultSimpleTiers,
  quotePriceFromTiers,
  SIMPLE_QUOTE_STEPS,
  type SimpleQuoteStep,
} from "@/lib/quotes/simple-builder";
import type {
  Company,
  Customer,
  Quote,
  QuoteBaselinePaintSystem,
  QuoteJobType,
  QuoteLineItem,
  QuotePaintDefault,
  QuoteRoom,
  QuoteSurface,
  QuoteTier,
  QuoteTierPaintConfig,
} from "@/types/database";

export type UseSimpleQuoteBuilderOptions = {
  mode: "create" | "edit";
  company: Company;
  customers: Customer[];
  paintProducts?: CompanyPaintProductRow[];
  quote?: Quote;
  rooms?: QuoteRoom[];
  surfaces?: QuoteSurface[];
  lineItems?: QuoteLineItem[];
  tiers?: QuoteTier[];
  paintDefaults?: QuotePaintDefault[];
  baselinePaintSystems?: QuoteBaselinePaintSystem[];
  tierPaintConfig?: QuoteTierPaintConfig[];
  estimateDefaults?: CompanyEstimateDefaults;
};

function mapBaselineFromDb(
  rows: QuoteBaselinePaintSystem[],
): BaselinePaintSystemInput[] {
  return rows.map((row) => ({
    application_scope: row.application_scope as BaselinePaintSystemInput["application_scope"],
    surface_category: row.surface_category as BaselinePaintSystemInput["surface_category"],
    primer_product_id: row.primer_product_id,
    topcoat_product_id: row.topcoat_product_id,
    primer_coats: row.primer_coats ?? 1,
    topcoat_coats: row.topcoat_coats ?? 2,
    primer_spot_prime: row.primer_spot_prime ?? false,
  }));
}

function tierConfigRecord(
  rows: TierPaintConfigInput[],
): Record<QuotePaintTier, TierPaintConfigInput> {
  const base = defaultTierPaintState();
  for (const row of rows) {
    if (isQuotePaintTier(row.tier)) {
      base[row.tier] = { ...base[row.tier], ...row };
    }
  }
  return base;
}

function tierConfigList(
  record: Record<QuotePaintTier, TierPaintConfigInput>,
): TierPaintConfigInput[] {
  return QUOTE_PAINT_TIERS.map((tier) => record[tier]);
}

function resolveInitialStep(
  quote: Quote | undefined,
  address: JobAddressFields,
  baselineRows: BaselinePaintSystemInput[],
  jobType: QuoteJobType,
  roomCount: number,
): SimpleQuoteStep {
  if (!quote?.customer_id || !hasMinimumJobAddress(address)) return "job";
  if (!isBaselineConfigured(baselineRows, jobType)) return "baseline";
  if (roomCount === 0) return "items";
  return "send";
}

function resolveMaxReachedIndex(step: SimpleQuoteStep): number {
  return SIMPLE_QUOTE_STEPS.indexOf(step);
}

export function useSimpleQuoteBuilder({
  mode,
  company,
  customers: initialCustomers,
  paintProducts = [],
  quote,
  rooms: initialRooms = [],
  surfaces: initialSurfaces = [],
  lineItems: initialLineItems = [],
  tiers: initialTiers = [],
  paintDefaults: initialPaintDefaults = [],
  baselinePaintSystems: initialBaselineRows = [],
  tierPaintConfig: initialTierPaintConfig = [],
  estimateDefaults,
}: UseSimpleQuoteBuilderOptions) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [customers, setCustomers] = useState(initialCustomers);
  const [error, setError] = useState<string | null>(null);
  const [quoteId, setQuoteId] = useState(quote?.id ?? "");
  const [status, setStatus] = useState(quote?.status ?? "draft");

  const initialAddress: JobAddressFields = {
    job_address: quote?.job_address ?? "",
    job_address_line2: quote?.job_address_line2 ?? "",
    job_city: quote?.job_city ?? "",
    job_state: quote?.job_state ?? "",
    job_zip: quote?.job_zip ?? "",
  };

  const initialJobType: QuoteJobType = quote?.job_type ?? "interior";
  const shouldSeedFromEstimateDefaults =
    Boolean(estimateDefaults) &&
    (mode === "create" || initialBaselineRows.length === 0);

  const initialBaselineFromDefaults = shouldSeedFromEstimateDefaults
    ? baselineSystemsForQuoteJob(estimateDefaults!, initialJobType)
    : null;

  const seededPaintDefaults =
    shouldSeedFromEstimateDefaults &&
    initialBaselineFromDefaults &&
    isBaselineConfigured(initialBaselineFromDefaults, initialJobType)
      ? baselineSystemsToPaintDefaults(
          initialBaselineFromDefaults,
          initialJobType,
        )
      : undefined;

  const mappedInitialLineItems: LineItemInput[] = initialLineItems.map(
    (item, index) => {
      const roomIndex =
        item.room_id != null
          ? initialRooms.findIndex((room) => room.id === item.room_id)
          : -1;
      return {
        type: item.type,
        description: item.description,
        qty: item.qty,
        unit_cost: item.unit_cost,
        markup: item.markup ?? 0,
        sort_order: item.sort_order ?? index,
        is_optional: item.is_optional ?? false,
        source: item.source ?? "manual",
        room_id: item.room_id,
        room_index: roomIndex >= 0 ? roomIndex : undefined,
        company_paint_product_id: item.company_paint_product_id,
        paint_role: item.paint_role,
        id: item.id,
      };
    },
  );

  const [customerId, setCustomerId] = useState(quote?.customer_id ?? "");
  const [jobType, setJobType] = useState<QuoteJobType>(initialJobType);

  const [jobAddress, setJobAddress] = useState(initialAddress);
  const [quoteName, setQuoteName] = useState(quote?.name ?? "");
  const [customMessage, setCustomMessage] = useState(
    quote?.custom_message ?? "",
  );

  const [baselinePaintSystems, setBaselinePaintSystems] = useState<
    BaselinePaintSystemInput[]
  >(() => {
    if (initialBaselineRows.length > 0) {
      return normalizeBaselinePaintSystems(
        mapBaselineFromDb(initialBaselineRows),
        initialJobType,
      );
    }
    if (initialBaselineFromDefaults) return initialBaselineFromDefaults;
    return emptyBaselinePaintSystems(initialJobType);
  });

  const [tierPaintConfig, setTierPaintConfig] = useState<
    Record<QuotePaintTier, TierPaintConfigInput>
  >(() => {
    const mapped = initialTierPaintConfig.map((row) => ({
      tier: row.tier as QuotePaintTier,
      primer_product_id: row.primer_product_id,
      topcoat_product_id: row.topcoat_product_id,
      primer_coats: row.primer_coats,
      topcoat_coats: row.topcoat_coats,
      primer_spot_prime: row.primer_spot_prime ?? false,
      labor_hours_delta_pct: row.labor_hours_delta_pct,
      labor_hours_delta_hours: row.labor_hours_delta_hours,
      prep_hours_delta: row.prep_hours_delta,
      value_add_features: row.value_add_features ?? [],
    }));
    if (
      shouldSeedFromEstimateDefaults &&
      initialTierPaintConfig.length === 0
    ) {
      return tierConfigRecord(
        tierDefaultsForJobType(estimateDefaults!, initialJobType),
      );
    }
    return tierConfigRecord(mapped);
  });

  const goodTierPaint = useMemo(() => {
    const productsById = new Map(paintProducts.map((product) => [product.id, product]));
    const resolved = resolveTierPaintConfig(tierPaintConfig.good, productsById);
    return resolved.topcoat ? resolved : null;
  }, [tierPaintConfig.good, paintProducts]);

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

  const areas = useSimpleQuoteAreas({
    mode,
    company,
    jobType,
    paintProducts,
    initialRooms,
    initialSurfaces,
    initialLineItems: mappedInitialLineItems,
    initialPaintDefaults,
    seededPaintDefaults: seededPaintDefaults ?? undefined,
    goodTierPaint,
    baselinePaintSystems,
    projectGrossMarginPct,
  });

  const {
    rooms,
    lineItems,
    itemsSubtotal,
    replacePaintDefaults,
    buildAllLineItems,
    regenerateAllLineItems,
    getDraftChildren,
  } = areas;

  const [tierRows, setTierRows] = useState<TierInput[]>(() => {
    if (initialTiers.length > 0) {
      return initialTiers.map((tier) => ({
        id: tier.id,
        tier: tier.tier,
        price: tier.price,
        margin: tier.margin,
        features: tier.features ?? [],
        benefits: tier.benefits ?? [],
        display_name: tier.display_name ?? null,
      }));
    }
    return defaultSimpleTiers(0);
  });

  const [quotePrice, setQuotePrice] = useState(() =>
    quotePriceFromTiers(initialTiers),
  );

  const [step, setStep] = useState<SimpleQuoteStep>(() =>
    resolveInitialStep(
      quote,
      initialAddress,
      baselinePaintSystems,
      initialJobType,
      initialRooms.length,
    ),
  );

  const [maxReachedIndex, setMaxReachedIndex] = useState(() =>
    resolveMaxReachedIndex(step),
  );

  const hasSavedBaseline = initialBaselineRows.length > 0;

  useEffect(() => {
    if (estimateDefaults && !hasSavedBaseline) return;

    setBaselinePaintSystems((prev) =>
      normalizeBaselinePaintSystems(prev, jobType),
    );
  }, [jobType, hasSavedBaseline, estimateDefaults]);

  const selectedCustomer = useMemo(
    () => customers.find((c) => c.id === customerId),
    [customers, customerId],
  );

  const suggestedJobPricing = useMemo(
    () =>
      suggestQuotePriceFromLineItems(
        lineItems,
        company,
        "good",
        projectGrossMarginPct,
      ),
    [lineItems, company, projectGrossMarginPct],
  );
  const isEditable = status === "draft";

  const syncGoodTierFromBaseline = useCallback(
    (systems: BaselinePaintSystemInput[]) => {
      const patch = goodTierPaintFromBaseline(systems, jobType);
      setTierPaintConfig((prev) => ({
        ...prev,
        good: { ...prev.good, ...patch, tier: "good" },
      }));
    },
    [jobType],
  );

  const applyBaselineToAreas = useCallback(
    (systems: BaselinePaintSystemInput[]) => {
      const paintDefaults = baselineSystemsToPaintDefaults(systems, jobType);
      replacePaintDefaults(paintDefaults);
      syncGoodTierFromBaseline(systems);
    },
    [replacePaintDefaults, jobType, syncGoodTierFromBaseline],
  );

  const applyEstimateDefaultsForJob = useCallback(
    (type: QuoteJobType = jobType) => {
      if (!estimateDefaults) return;
      if (hasSavedBaseline) return;

      const systems = baselineSystemsForQuoteJob(estimateDefaults, type);
      const tiers = tierDefaultsForJobType(estimateDefaults, type);

      setBaselinePaintSystems(systems);
      setTierPaintConfig(tierConfigRecord(tiers));

      if (!isBaselineConfigured(systems, type)) return;

      replacePaintDefaults(baselineSystemsToPaintDefaults(systems, type));
      syncGoodTierFromBaseline(systems);
    },
    [
      estimateDefaults,
      hasSavedBaseline,
      jobType,
      replacePaintDefaults,
      syncGoodTierFromBaseline,
    ],
  );

  const lastEstimateDefaultsSeedRef = useRef<string | null>(null);

  useEffect(() => {
    if (!estimateDefaults || hasSavedBaseline) return;
    const shouldSeed = mode === "create" || mode === "edit";
    if (!shouldSeed) return;

    const systems = baselineSystemsForQuoteJob(estimateDefaults, jobType);
    const tiers = tierDefaultsForJobType(estimateDefaults, jobType);
    const seedKey = `${mode}:${jobType}:${JSON.stringify({ systems, tiers })}`;
    if (lastEstimateDefaultsSeedRef.current === seedKey) return;
    lastEstimateDefaultsSeedRef.current = seedKey;

    applyEstimateDefaultsForJob(jobType);
  }, [
    jobType,
    mode,
    estimateDefaults,
    hasSavedBaseline,
    applyEstimateDefaultsForJob,
  ]);

  useEffect(() => {
    if (initialBaselineRows.length > 0) {
      const systems = normalizeBaselinePaintSystems(
        mapBaselineFromDb(initialBaselineRows),
        initialJobType,
      );
      replacePaintDefaults(
        baselineSystemsToPaintDefaults(systems, initialJobType),
      );
      syncGoodTierFromBaseline(systems);
      return;
    }
    if (
      shouldSeedFromEstimateDefaults &&
      initialBaselineFromDefaults &&
      isBaselineConfigured(initialBaselineFromDefaults, initialJobType)
    ) {
      syncGoodTierFromBaseline(initialBaselineFromDefaults);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- hydrate once from server / company defaults
  }, []);

  const getDraft = useCallback(
    (lineItemsOverride?: LineItemInput[]): QuoteDraftInput => {
      const price = quotePrice > 0 ? quotePrice : itemsSubtotal;
      const children = getDraftChildren(lineItemsOverride);
      const tiers = defaultSimpleTiers(price).map((row) => {
        const existing = tierRows.find((t) => t.tier === row.tier);
        return existing
          ? { ...row, ...existing, price: row.tier === "good" ? price : existing.price }
          : row;
      });

      return {
        header: {
          customer_id: customerId,
          name: quoteName.trim() || null,
          job_type: jobType,
          custom_message: customMessage.trim() || null,
          estimation_mode: "hybrid",
          ...jobAddress,
          job_address: jobAddress.job_address.trim(),
        },
        rooms: children.rooms,
        surfaces: children.surfaces,
        lineItems: children.lineItems,
        tiers,
        tierPaintConfig: tierConfigList(tierPaintConfig),
        paintDefaults: children.paintDefaults,
        baselinePaintSystems,
      };
    },
    [
      customerId,
      quoteName,
      jobType,
      customMessage,
      jobAddress,
      quotePrice,
      itemsSubtotal,
      getDraftChildren,
      tierRows,
      tierPaintConfig,
      baselinePaintSystems,
    ],
  );

  const ensureQuote = useCallback(async (): Promise<string | null> => {
    if (quoteId) return quoteId;
    if (!customerId || !hasMinimumJobAddress(jobAddress)) {
      setError("Select a customer and enter the job address.");
      return null;
    }

    const result = await createQuote({
      customer_id: customerId,
      name: quoteName.trim() || null,
      job_type: jobType,
      estimation_mode: "hybrid",
      ...jobAddress,
      job_address: jobAddress.job_address.trim(),
    });

    if (!result.success) {
      setError(result.error);
      return null;
    }

    setQuoteId(result.data.id);
    router.replace(`/app/quotes/${result.data.id}`, { scroll: false });
    return result.data.id;
  }, [quoteId, customerId, quoteName, jobAddress, jobType, router]);

  const saveDraft = useCallback(
    async (id: string, lineItemsOverride?: LineItemInput[]) => {
      const draft = getDraft(lineItemsOverride);
      return enqueueQuoteSave(() => saveQuoteDraft(id, draft));
    },
    [getDraft],
  );

  const addCustomer = useCallback((customer: Customer) => {
    setCustomers((prev) =>
      [...prev, customer].sort((a, b) => a.name.localeCompare(b.name)),
    );
  }, []);

  const goToStep = useCallback((next: SimpleQuoteStep) => {
    const index = SIMPLE_QUOTE_STEPS.indexOf(next);
    setStep(next);
    setMaxReachedIndex((prev) => Math.max(prev, index));
    setError(null);
  }, []);

  const updateBaselineSystem = useCallback(
    (
      scope: BaselinePaintSystemInput["application_scope"],
      category: BaselinePaintSystemInput["surface_category"],
      patch: Partial<BaselinePaintSystemInput>,
    ) => {
      setBaselinePaintSystems((prev) =>
        prev.map((row) =>
          row.application_scope === scope && row.surface_category === category
            ? { ...row, ...patch }
            : row,
        ),
      );
    },
    [],
  );

  const updateTierPaint = useCallback(
    (tier: QuotePaintTier, patch: Partial<TierPaintConfigInput>) => {
      setTierPaintConfig((prev) => ({
        ...prev,
        [tier]: { ...prev[tier], ...patch, tier },
      }));
    },
    [],
  );

  const updateTierDisplayName = useCallback(
    (tier: QuotePaintTier, displayName: string) => {
      setTierRows((prev) =>
        prev.map((row) =>
          row.tier === tier
            ? { ...row, display_name: displayName.trim() || null }
            : row,
        ),
      );
    },
    [],
  );

  const baselineTopcoatName = useMemo(() => {
    const patch = goodTierPaintFromBaseline(baselinePaintSystems, jobType);
    if (!patch.topcoat_product_id) return null;
    return (
      paintProducts.find((p) => p.id === patch.topcoat_product_id)?.name ?? null
    );
  }, [baselinePaintSystems, jobType, paintProducts]);

  const handleNext = useCallback(() => {
    startTransition(async () => {
      setError(null);
      if (!isEditable) {
        setError("Revise this quote to draft before editing.");
        return;
      }

      if (step === "job") {
        if (!customerId || !hasMinimumJobAddress(jobAddress)) {
          setError("Select a customer and enter the full job address.");
          return;
        }
        const id = await ensureQuote();
        if (!id) return;
        const result = await updateQuote(id, getDraft().header!);
        if (!result.success) {
          setError(result.error);
          return;
        }
        applyEstimateDefaultsForJob(jobType);
        goToStep("baseline");
        return;
      }

      if (step === "baseline") {
        if (!isBaselineConfigured(baselinePaintSystems, jobType)) {
          setError("Select a wall topcoat to finish your paint systems.");
          return;
        }
        const id = await ensureQuote();
        if (!id) return;
        applyBaselineToAreas(baselinePaintSystems);
        const result = await saveDraft(id);
        if (!result.success) {
          setError(result.error);
          return;
        }
        goToStep("items");
        return;
      }

      if (step === "items") {
        if (rooms.length === 0) {
          setError("Add at least one area.");
          return;
        }
        const missingDimensions = rooms.some(
          (room) => room.sq_ft <= 0 && !room.length_ft,
        );
        if (missingDimensions) {
          setError("Open each area and enter dimensions before continuing.");
          return;
        }
        const id = await ensureQuote();
        if (!id) return;
        const generatedItems = buildAllLineItems();
        regenerateAllLineItems();
        if (quotePrice <= 0 && generatedItems.length > 0) {
          const suggested = suggestQuotePriceFromLineItems(
            generatedItems,
            company,
          );
          if (suggested.sellingPrice > 0) {
            setQuotePrice(suggested.sellingPrice);
          }
        }
        const result = await saveDraft(id, generatedItems);
        if (!result.success) {
          setError(result.error);
          return;
        }
        syncGoodTierFromBaseline(baselinePaintSystems);
        goToStep("tiers");
        return;
      }

      if (step === "tiers") {
        const id = await ensureQuote();
        if (!id) return;
        const result = await saveDraft(id);
        if (!result.success) {
          setError(result.error);
          return;
        }
        goToStep("send");
        return;
      }
    });
  }, [
    isEditable,
    step,
    customerId,
    jobAddress,
    ensureQuote,
    getDraft,
    goToStep,
    baselinePaintSystems,
    jobType,
    applyBaselineToAreas,
    applyEstimateDefaultsForJob,
    saveDraft,
    rooms,
    buildAllLineItems,
    regenerateAllLineItems,
    quotePrice,
    syncGoodTierFromBaseline,
  ]);

  const handleBack = useCallback(() => {
    const index = SIMPLE_QUOTE_STEPS.indexOf(step);
    if (index > 0) {
      goToStep(SIMPLE_QUOTE_STEPS[index - 1]);
    }
  }, [step, goToStep]);

  const handleSend = useCallback(() => {
    startTransition(async () => {
      setError(null);
      const price = quotePrice > 0 ? quotePrice : itemsSubtotal;
      if (price <= 0) {
        setError("Enter a quote price before sending.");
        return;
      }
      const id = await ensureQuote();
      if (!id) return;
      const generatedItems = buildAllLineItems();
      regenerateAllLineItems();
      const saveResult = await saveDraft(id, generatedItems);
      if (!saveResult.success) {
        setError(saveResult.error);
        return;
      }
      const result = await sendQuote(id);
      if (!result.success) {
        setError(result.error);
        toast.error(result.error);
        return;
      }
      setStatus("sent");
      toast.success("Quote sent");
    });
  }, [
    quotePrice,
    itemsSubtotal,
    ensureQuote,
    buildAllLineItems,
    regenerateAllLineItems,
    saveDraft,
  ]);

  return {
    mode,
    company,
    step,
    maxReachedIndex,
    goToStep,
    handleNext,
    handleBack,
    handleSend,
    error,
    isPending,
    isEditable,
    quoteId,
    status,
    customers,
    customerId,
    setCustomerId,
    addCustomer,
    selectedCustomer,
    quoteName,
    setQuoteName,
    jobType,
    setJobType,
    jobAddress,
    setJobAddress,
    areas,
    itemsSubtotal,
    suggestedJobPricing,
    projectGrossMarginPct,
    setProjectGrossMarginPct,
    quotePrice,
    setQuotePrice,
    customMessage,
    setCustomMessage,
    baselinePaintSystems,
    updateBaselineSystem,
    tierPaintConfig,
    updateTierPaint,
    tierRows,
    updateTierDisplayName,
    baselineTopcoatName,
    paintProducts,
    getDraft,
    saveDraft,
    ensureQuote,
  };
}