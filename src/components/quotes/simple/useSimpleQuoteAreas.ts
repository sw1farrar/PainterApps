"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import type {
  LineItemInput,
  QuotePaintDefaultInput,
  RoomInput,
  SurfaceInput,
} from "@/app/app/(portal)/quotes/actions";
import type {
  CompanyPaintProductRow,
  ResolvedTierPaintConfig,
} from "@/lib/paint-library/types";
import type { BaselinePaintSystemInput } from "@/lib/quotes/baseline-paint";
import {
  AREA_SURFACE_CATALOG,
  areaSurfaceByKey,
  type AreaSurfaceKey,
} from "@/lib/quotes/area-surface-catalog";
import {
  AUTO_ENABLED_SURFACE_KEYS,
  CLOSET_SYNC_SURFACE_KEYS,
  ROOM_SYNC_SURFACE_KEYS,
  encodeClosetNotes,
  parseClosetDimensions,
  sqFtForAreaSurfaceKey,
  totalWallSqFtFromRoom,
  type ClosetDimensions,
} from "@/lib/quotes/area-surface-dimensions";
import {
  applyDefaultsToSurfaces,
  emptyPaintDefaults,
  inferInitialPaintDefaults,
  normalizeQuotePaintDefaults,
  paintDefaultsRecord,
} from "@/lib/quotes/paint-defaults";
import { DEFAULT_PRODUCT_COVERAGE_SQFT_PER_GALLON } from "@/lib/paint-library/coverage";
import { computeSurfaceGallons } from "@/lib/quotes/surface-gallons";
import {
  computeAreaBidPrice,
  computeAreaCostBreakdown,
  getAreaLineItems,
  type AreaCostBreakdown,
} from "@/lib/quotes/area-pricing";
import {
  activeSubstrateDefinitionsForRoom,
  addCustomSubstrate,
  customSubstrateSurfaceDefinition,
  findSubstrateDefinition,
  isCustomSurfaceKey,
  removeCustomSubstrate,
  resolveCustomSubstrateById,
  resolveCustomSubstrates,
  type CustomSubstrateId,
} from "@/lib/quotes/area-custom-substrates";
import {
  rollupAreaWorkItemsFromLineItems,
  type AreaWorkItemsRollup,
} from "@/lib/quotes/area-substrate-pricing";
import {
  areaNameBase,
  buildIndexMapAfterDelete,
  nextSequencedAreaName,
  remapRoomIndices,
} from "@/lib/quotes/area-helpers";
import {
  buildLineItemsForArea,
  regenerateLineItems,
} from "@/lib/quotes/estimation";
import { getCompanyPricingSummary } from "@/lib/quotes/estimate-from-rooms";
import { lineItemLineTotal } from "@/lib/quotes/pricing";
import { defaultScopePrepWorkForJobType } from "@/lib/quotes/scope-library";
import {
  activeSubstratesForRoom,
  applySubstrateMarkupsToLineItems,
  resolveDefaultMarkupPct,
  setSubstrateMarkupPct,
  updateLineItemsSubstrateMarkup,
  type SubstrateMarkupKey,
} from "@/lib/quotes/substrate-markup";
import {
  listKeysForSubstrate,
  substrateById,
} from "@/lib/quotes/area-substrates";
import {
  resetSubstrateProductivityOverride,
  setSubstrateProductivityOverride,
} from "@/lib/quotes/substrate-productivity";
import {
  clearDerivedSurfaceEstimates,
  clearLaborHoursOverride,
  mergeSurfaceOverrideNotes,
  shouldRecalculateDerivedEstimates,
} from "@/lib/quotes/surface-overrides";
import type { SurfaceLaborOverride } from "@/lib/quotes/surface-labor-defaults";
import type { AreaSubstrateId } from "@/lib/quotes/area-substrates";
import type {
  Company,
  QuoteJobType,
  QuotePaintDefault,
  QuoteRoom,
  QuoteSurface,
} from "@/types/database";
const EMPTY_CUSTOM_LINE_ITEM: LineItemInput = {
  type: "extra",
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

function isGlobalCustomLineItem(item: LineItemInput): boolean {
  return (
    item.source === "manual" &&
    item.room_index === undefined &&
    !item.room_id
  );
}

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

type AreaEditSnapshot = {
  index: number;
  room: RoomInput;
  surfaces: SurfaceInput[];
  paintDefaults: QuotePaintDefaultInput[];
};

function snapshotAreaState(
  index: number,
  room: RoomInput,
  surfaces: SurfaceInput[],
  paintDefaults: QuotePaintDefaultInput[],
): AreaEditSnapshot {
  return {
    index,
    room: { ...room },
    surfaces: surfaces
      .filter((surface) => surface.room_index === index)
      .map((surface) => ({ ...surface })),
    paintDefaults: normalizeQuotePaintDefaults(paintDefaults).map((row) => ({
      ...row,
    })),
  };
}

function withGallonsEstimated(
  surface: SurfaceInput,
  company: Company,
  productsById: Map<string, CompanyPaintProductRow>,
  jobType: QuoteJobType,
): SurfaceInput {
  const product = surface.company_paint_product_id
    ? productsById.get(surface.company_paint_product_id) ?? null
    : null;
  const gallons = computeSurfaceGallons(
    surface.sq_ft,
    surface.coats,
    surface.rate_type ?? "sqft",
    product,
    company,
    { surfaceType: surface.surface_type, jobType },
  );
  return { ...surface, gallons_estimated: gallons > 0 ? gallons : null };
}

function snapshotsEqual(a: AreaEditSnapshot, b: AreaEditSnapshot): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

function mapSurfaceToInput(
  surface: QuoteSurface,
  rooms: RoomInput[],
): SurfaceInput {
  const roomIndex = rooms.findIndex((room) => room.id === surface.room_id);
  return {
    id: surface.id,
    surface_type: surface.surface_type,
    sq_ft: surface.sq_ft,
    coats: surface.coats,
    unit_rate: surface.unit_rate,
    rate_type: surface.rate_type,
    room_id: surface.room_id,
    room_index: roomIndex >= 0 ? roomIndex : undefined,
    is_optional: surface.is_optional ?? false,
    sort_order: surface.sort_order,
    notes: surface.notes,
    company_paint_product_id: surface.company_paint_product_id ?? null,
    product_override: surface.product_override ?? false,
    gallons_estimated: surface.gallons_estimated ?? null,
    surface_key: surface.surface_key ?? null,
  };
}

function findAreaSurface(
  surfaces: SurfaceInput[],
  roomIndex: number,
  surfaceKey: string,
): SurfaceInput | undefined {
  return surfaces.find(
    (surface) =>
      surface.room_index === roomIndex && surface.surface_key === surfaceKey,
  );
}

function closetDimsForRoom(
  surfaces: SurfaceInput[],
  roomIndex: number,
): ClosetDimensions | null {
  const closet = surfaces.find(
    (surface) =>
      surface.room_index === roomIndex && surface.surface_key === "closet",
  );
  return parseClosetDimensions(closet?.notes);
}

function stripLegacyAggregateSurfaces(
  surfaces: SurfaceInput[],
  roomIndex: number,
): SurfaceInput[] {
  return surfaces.filter(
    (surface) =>
      !(
        surface.room_index === roomIndex &&
        !surface.surface_key &&
        (surface.surface_type === "wall" || surface.surface_type === "ceiling")
      ),
  );
}

function mapPaintDefaultToInput(row: QuotePaintDefault): QuotePaintDefaultInput {
  return {
    surface_type: row.surface_type,
    company_paint_product_id: row.company_paint_product_id,
    coats: row.coats ?? 2,
  };
}

type UseSimpleQuoteAreasOptions = {
  mode?: "create" | "edit";
  company: Company;
  jobType?: QuoteJobType;
  paintProducts?: CompanyPaintProductRow[];
  initialRooms?: QuoteRoom[];
  initialSurfaces?: QuoteSurface[];
  initialLineItems?: LineItemInput[];
  initialPaintDefaults?: QuotePaintDefault[];
  /** Pre-normalized paint defaults (e.g. from company baseline) — used on new quotes. */
  seededPaintDefaults?: QuotePaintDefaultInput[];
  goodTierPaint?: ResolvedTierPaintConfig | null;
  baselinePaintSystems?: BaselinePaintSystemInput[];
};

export function useSimpleQuoteAreas({
  mode = "edit",
  company,
  jobType = "interior",
  paintProducts = [],
  initialRooms = [],
  initialSurfaces = [],
  initialLineItems = [],
  initialPaintDefaults = [],
  seededPaintDefaults,
  goodTierPaint = null,
  baselinePaintSystems = [],
}: UseSimpleQuoteAreasOptions) {
  const [rooms, setRooms] = useState<RoomInput[]>(() =>
    initialRooms.map(mapRoomToInput),
  );
  const [surfaces, setSurfaces] = useState<SurfaceInput[]>(() => {
    const mappedRooms = initialRooms.map(mapRoomToInput);
    return initialSurfaces.map((surface) =>
      mapSurfaceToInput(surface, mappedRooms),
    );
  });
  const [lineItems, setLineItems] = useState<LineItemInput[]>(initialLineItems);
  const [paintDefaults, setPaintDefaults] = useState<QuotePaintDefaultInput[]>(
    () => {
      if (initialPaintDefaults.length > 0) {
        return normalizeQuotePaintDefaults(
          initialPaintDefaults.map(mapPaintDefaultToInput),
        );
      }
      if (seededPaintDefaults?.length) {
        return normalizeQuotePaintDefaults(seededPaintDefaults);
      }
      // Only infer catalog products for new quotes — never re-apply on edit refresh.
      if (mode === "create" && paintProducts.length > 0) {
        return normalizeQuotePaintDefaults(
          inferInitialPaintDefaults(paintProducts),
        );
      }
      return emptyPaintDefaults();
    },
  );
  const [editingAreaIndex, setEditingAreaIndex] = useState<number | null>(null);
  const [editingSnapshot, setEditingSnapshot] =
    useState<AreaEditSnapshot | null>(null);
  const roomsRef = useRef(rooms);
  const surfacesRef = useRef(surfaces);
  const lineItemsRef = useRef(lineItems);
  const paintDefaultsRef = useRef(paintDefaults);
  roomsRef.current = rooms;
  surfacesRef.current = surfaces;
  lineItemsRef.current = lineItems;
  paintDefaultsRef.current = paintDefaults;

  const productsById = useMemo(
    () => new Map(paintProducts.map((product) => [product.id, product])),
    [paintProducts],
  );

  useEffect(() => {
    if (editingAreaIndex === null) return;
    const index = editingAreaIndex;
    const timer = window.setTimeout(() => {
      const room = roomsRef.current[index];
      if (!room) return;
      setEditingSnapshot(
        snapshotAreaState(
          index,
          room,
          surfacesRef.current,
          paintDefaultsRef.current,
        ),
      );
    }, 600);
    return () => window.clearTimeout(timer);
  }, [editingAreaIndex]);

  const pricingSummary = useMemo(
    () => getCompanyPricingSummary(company),
    [company],
  );

  const coverage = DEFAULT_PRODUCT_COVERAGE_SQFT_PER_GALLON;

  const estimateContext = useMemo(
    () => ({
      company,
      rooms,
      surfaces,
      manualItems: [] as LineItemInput[],
      estimationMode: "hybrid" as const,
      jobType,
      goodTierPaint,
      paintDefaults,
      baselineSystems: baselinePaintSystems,
      productsById,
    }),
    [
      company,
      goodTierPaint,
      jobType,
      rooms,
      surfaces,
      paintDefaults,
      baselinePaintSystems,
      productsById,
    ],
  );

  const areaPricingOptions = useMemo(
    () => ({
      lineItems,
      includeOptionalLineItems: true,
    }),
    [lineItems],
  );

  const defaultMarkupPct = useMemo(
    () => resolveDefaultMarkupPct(company),
    [company],
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

  const editingAreaPreviewLineItems = useMemo(() => {
    if (editingAreaIndex === null) return null;
    return getAreaLineItems(editingAreaIndex, estimateContext, {
      previewFromSurfaces: true,
    });
  }, [editingAreaIndex, estimateContext, rooms, surfaces]);

  const editingAreaPreviewBreakdown = useMemo(() => {
    if (editingAreaIndex === null) return null;
    return computeAreaCostBreakdown(editingAreaIndex, estimateContext, {
      previewFromSurfaces: true,
    });
  }, [editingAreaIndex, estimateContext, rooms, surfaces]);

  const editingAreaWorkItemsRollup = useMemo((): AreaWorkItemsRollup | null => {
    if (editingAreaIndex === null || !editingAreaPreviewLineItems) return null;
    const room = rooms[editingAreaIndex];
    if (!room) return null;

    const roomSurfaces = surfaces.filter(
      (surface) => surface.room_index === editingAreaIndex,
    );
    const surfaceByKey = new Map<AreaSurfaceKey, SurfaceInput>();
    for (const surface of roomSurfaces) {
      if (surface.surface_key) {
        surfaceByKey.set(surface.surface_key as AreaSurfaceKey, surface);
      }
    }
    const activeSubstrates = activeSubstrateDefinitionsForRoom(
      room.prep_work,
      new Set(surfaceByKey.keys()),
    );

    return rollupAreaWorkItemsFromLineItems(
      editingAreaPreviewLineItems,
      activeSubstrates,
      surfaceByKey,
      room,
      editingAreaIndex,
      company,
      jobType,
      paintProducts,
      paintDefaults,
    );
  }, [
    company,
    editingAreaIndex,
    editingAreaPreviewLineItems,
    estimateContext,
    jobType,
    paintDefaults,
    paintProducts,
    rooms,
    surfaces,
  ]);

  const markedLineItems = useMemo(() => {
    const marked = lineItems.map((item) => ({ ...item }));
    for (let roomIndex = 0; roomIndex < rooms.length; roomIndex++) {
      const room = rooms[roomIndex];
      const activeSubstrates = activeSubstratesForRoom(
        surfaces,
        roomIndex,
        room?.prep_work,
      );
      const roomItemIndexes = marked
        .map((item, index) => ({ item, index }))
        .filter(
          ({ item }) =>
            item.room_index === roomIndex || item.room_id === room?.id,
        );
      if (roomItemIndexes.length === 0) continue;

      const roomItems = roomItemIndexes.map(({ item }) => item);
      const withMarkup = applySubstrateMarkupsToLineItems(
        roomItems,
        activeSubstrates,
        room?.prep_work,
        defaultMarkupPct,
      );
      roomItemIndexes.forEach(({ index }, i) => {
        marked[index] = { ...marked[index], markup: withMarkup[i].markup };
      });
    }
    return marked;
  }, [lineItems, rooms, surfaces, defaultMarkupPct]);

  const customQuoteLineItems = useMemo(
    () =>
      lineItems
        .map((item, index) => ({ item, index }))
        .filter(({ item }) => isGlobalCustomLineItem(item)),
    [lineItems],
  );

  const itemsSubtotal = useMemo(() => {
    const areasTotal = rooms.reduce((sum, room, index) => {
      if (room.is_optional) return sum;
      return sum + (areaSubtotals[index] ?? 0);
    }, 0);
    const customTotal = customQuoteLineItems.reduce((sum, { item }) => {
      if (item.is_optional) return sum;
      return sum + lineItemLineTotal(item);
    }, 0);
    return Math.round((areasTotal + customTotal) * 100) / 100;
  }, [areaSubtotals, customQuoteLineItems, rooms]);

  const addCustomQuoteLineItem = useCallback(
    (draft: Pick<LineItemInput, "type" | "description" | "qty" | "unit_cost" | "markup">) => {
      const trimmed = draft.description.trim();
      if (!trimmed) {
        toast.error("Line item description is required.");
        return;
      }
      setLineItems((prev) => [
        ...prev,
        {
          ...EMPTY_CUSTOM_LINE_ITEM,
          ...draft,
          description: trimmed,
          markup: draft.markup ?? defaultMarkupPct,
          sort_order: prev.length,
        },
      ]);
    },
    [defaultMarkupPct],
  );

  const updateCustomQuoteLineItem = useCallback(
    (
      index: number,
      draft: Pick<LineItemInput, "type" | "description" | "qty" | "unit_cost" | "markup">,
    ) => {
      const trimmed = draft.description.trim();
      if (!trimmed) {
        toast.error("Line item description is required.");
        return;
      }
      setLineItems((prev) =>
        prev.map((item, i) =>
          i === index
            ? {
                ...item,
                ...draft,
                description: trimmed,
                source: "manual" as const,
              }
            : item,
        ),
      );
    },
    [],
  );

  const removeCustomQuoteLineItem = useCallback((index: number) => {
    setLineItems((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const toggleAreaIncluded = useCallback((index: number) => {
    const room = roomsRef.current[index];
    if (!room) return;
    const nextOptional = !room.is_optional;
    setRooms((prev) =>
      prev.map((row, i) =>
        i === index ? { ...row, is_optional: nextOptional } : row,
      ),
    );
    setLineItems((prev) =>
      prev.map((item) => {
        const linked =
          item.room_index === index || item.room_id === room.id;
        if (!linked) return item;
        return { ...item, is_optional: nextOptional };
      }),
    );
  }, []);

  const toggleCustomQuoteLineItemIncluded = useCallback((index: number) => {
    setLineItems((prev) =>
      prev.map((item, i) =>
        i === index ? { ...item, is_optional: !item.is_optional } : item,
      ),
    );
  }, []);

  const applyMarkupsToGeneratedItems = useCallback(
    (items: LineItemInput[]) => {
      const next = items.map((item) => ({ ...item }));
      for (let roomIndex = 0; roomIndex < rooms.length; roomIndex++) {
        const room = rooms[roomIndex];
        const activeSubstrates = activeSubstratesForRoom(
          surfaces,
          roomIndex,
          room?.prep_work,
        );
        const indexes = next
          .map((item, index) => ({ item, index }))
          .filter(
            ({ item }) =>
              item.room_index === roomIndex || item.room_id === room?.id,
          );
        if (indexes.length === 0) continue;
        const roomItems = indexes.map(({ item }) => item);
        const withMarkup = applySubstrateMarkupsToLineItems(
          roomItems,
          activeSubstrates,
          room?.prep_work,
          defaultMarkupPct,
        );
        indexes.forEach(({ index }, i) => {
          next[index] = { ...next[index], markup: withMarkup[i].markup };
        });
      }
      return next;
    },
    [rooms, surfaces, defaultMarkupPct],
  );

  const buildAllLineItems = useCallback(() => {
    if (!rooms.length) return [];
    return applyMarkupsToGeneratedItems(
      regenerateLineItems(estimateContext, lineItems),
    );
  }, [applyMarkupsToGeneratedItems, estimateContext, lineItems, rooms.length]);

  const regenerateAllLineItems = useCallback(() => {
    const next = buildAllLineItems();
    setLineItems(next);
    return next;
  }, [buildAllLineItems]);

  const regenerateAreaLineItems = useCallback(
    (roomIndex: number) => {
      const room = rooms[roomIndex];
      const activeSubstrates = activeSubstratesForRoom(
        surfaces,
        roomIndex,
        room?.prep_work,
      );
      const generated = buildLineItemsForArea(roomIndex, {
        ...estimateContext,
        manualItems: [],
      }).map((item) => ({
        ...item,
        room_index: roomIndex,
        room_id: room?.id ?? null,
      }));
      const newItems = applySubstrateMarkupsToLineItems(
        generated,
        activeSubstrates,
        room?.prep_work,
        defaultMarkupPct,
      );

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
    },
    [estimateContext, rooms, surfaces, defaultMarkupPct],
  );

  const updateSubstrateMargin = useCallback(
    (roomIndex: number, markupKey: SubstrateMarkupKey, marginPct: number) => {
      const room = rooms[roomIndex];
      if (!room) return;

      const nextPrepWork = setSubstrateMarkupPct(
        room.prep_work,
        markupKey,
        marginPct,
        defaultMarkupPct,
      );
      setRooms((prev) =>
        prev.map((row, index) =>
          index === roomIndex ? { ...row, prep_work: nextPrepWork } : row,
        ),
      );

      const substrate =
        markupKey === "sundries"
          ? null
          : findSubstrateDefinition(room.prep_work, markupKey) ?? null;

      setLineItems((prev) =>
        updateLineItemsSubstrateMarkup(
          prev,
          roomIndex,
          room.id,
          substrate,
          marginPct,
          markupKey === "sundries",
        ),
      );
    },
    [rooms, defaultMarkupPct],
  );

  const clearLaborOverridesForSubstrate = useCallback(
    (roomIndex: number, substrateId: AreaSubstrateId) => {
      const room = rooms[roomIndex];
      if (!room) return;
      const substrate =
        findSubstrateDefinition(room.prep_work, substrateId) ??
        substrateById(substrateId);
      if (!substrate) return;

      const keys = new Set(listKeysForSubstrate(substrate));
      setSurfaces((prev) =>
        prev.map((surface) => {
          if (surface.room_index !== roomIndex) return surface;
          if (
            !surface.surface_key ||
            !keys.has(surface.surface_key as AreaSurfaceKey)
          ) {
            return surface;
          }
          return {
            ...surface,
            notes: clearLaborHoursOverride(surface.notes),
          };
        }),
      );
    },
    [rooms],
  );

  const updateSubstrateProductivity = useCallback(
    (
      roomIndex: number,
      substrateId: AreaSubstrateId,
      patch: Partial<SurfaceLaborOverride>,
    ) => {
      const room = rooms[roomIndex];
      if (!room) return;

      const nextPrepWork = setSubstrateProductivityOverride(
        room.prep_work,
        substrateId,
        patch,
      );
      setRooms((prev) =>
        prev.map((row, index) =>
          index === roomIndex ? { ...row, prep_work: nextPrepWork } : row,
        ),
      );
      clearLaborOverridesForSubstrate(roomIndex, substrateId);
      queueMicrotask(() => regenerateAreaLineItems(roomIndex));
    },
    [rooms, clearLaborOverridesForSubstrate, regenerateAreaLineItems],
  );

  const resetSubstrateProductivity = useCallback(
    (roomIndex: number, substrateId: AreaSubstrateId) => {
      const room = rooms[roomIndex];
      if (!room) return;

      const nextPrepWork = resetSubstrateProductivityOverride(
        room.prep_work,
        substrateId,
      );
      setRooms((prev) =>
        prev.map((row, index) =>
          index === roomIndex ? { ...row, prep_work: nextPrepWork } : row,
        ),
      );
      clearLaborOverridesForSubstrate(roomIndex, substrateId);
      queueMicrotask(() => regenerateAreaLineItems(roomIndex));
    },
    [rooms, clearLaborOverridesForSubstrate, regenerateAreaLineItems],
  );

  const addAreaFromTemplate = useCallback(
    (baseName: string) => {
      let newIndex = -1;
      let addedName = "";

      setRooms((prev) => {
        const name = nextSequencedAreaName(baseName, prev);
        newIndex = prev.length;
        addedName = name;
        return [
          ...prev,
          {
            ...EMPTY_ROOM,
            name,
            sort_order: newIndex,
            prep_work: defaultScopePrepWorkForJobType(jobType),
          },
        ];
      });

      if (newIndex >= 0) {
        toast.success(`Added ${addedName}`);
      }
    },
    [jobType],
  );

  const duplicateArea = useCallback(
    (index: number) => {
      const source = rooms[index];
      if (!source) return;

      const base = areaNameBase(source.name);
      const name = nextSequencedAreaName(base, rooms);
      const newIndex = rooms.length;

      setRooms((prev) => [
        ...prev,
        {
          ...source,
          id: undefined,
          name,
          sort_order: newIndex,
        },
      ]);

      const sourceSurfaces = surfaces.filter(
        (surface) => surface.room_index === index,
      );
      if (sourceSurfaces.length > 0) {
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

      const sourceItems = lineItems.filter(
        (item) =>
          item.room_index === index || item.room_id === source.id,
      );
      if (sourceItems.length > 0) {
        setLineItems((prev) => [
          ...prev,
          ...sourceItems.map((item, sort_order) => ({
            ...item,
            id: undefined,
            room_id: null,
            room_index: newIndex,
            sort_order: item.sort_order ?? sort_order,
          })),
        ]);
      } else {
        queueMicrotask(() => regenerateAllLineItems());
      }

      toast.success(`Copied as ${name}`);
    },
    [rooms, surfaces, lineItems, regenerateAllLineItems],
  );

  const updateArea = useCallback(
    (index: number, patch: Partial<RoomInput>) => {
      setRooms((prev) =>
        prev.map((room, i) => (i === index ? { ...room, ...patch } : room)),
      );

      if (patch.coats == null || !Number.isFinite(patch.coats)) return;

      setSurfaces((prev) => {
        const next = prev.map((surface) => {
          if (surface.room_index !== index) return surface;
          const updated = {
            ...surface,
            coats: patch.coats!,
            notes: clearDerivedSurfaceEstimates(surface.notes),
          };
          return withGallonsEstimated(updated, company, productsById, jobType);
        });
        surfacesRef.current = next;
        return next;
      });
      queueMicrotask(() => regenerateAreaLineItems(index));
    },
    [company, productsById, jobType, regenerateAreaLineItems],
  );

  const deleteArea = useCallback((index: number) => {
    const deletedRoomId = roomsRef.current[index]?.id;
    const map = buildIndexMapAfterDelete(roomsRef.current.length, index);

    const nextRooms = roomsRef.current
      .filter((_, i) => i !== index)
      .map((room, i) => ({ ...room, sort_order: i }));

    const nextSurfaces = remapRoomIndices(
      surfacesRef.current.filter((surface) => surface.room_index !== index),
      map,
    ).map((surface) => ({ ...surface, room_id: undefined }));

    const nextLineItems = remapRoomIndices(
      lineItemsRef.current.filter(
        (item) =>
          item.room_index !== index && item.room_id !== deletedRoomId,
      ),
      map,
    ).map((item) => ({ ...item, room_id: null }));

    roomsRef.current = nextRooms;
    surfacesRef.current = nextSurfaces;
    lineItemsRef.current = nextLineItems;

    setRooms(nextRooms);
    setSurfaces(nextSurfaces);
    setLineItems(nextLineItems);
    setEditingAreaIndex(null);
    setEditingSnapshot(null);
  }, []);

  const buildSurfaceForKey = useCallback(
    (
      roomIndex: number,
      surfaceKey: string,
      closet?: ClosetDimensions | null,
    ): SurfaceInput | null => {
      const room = rooms[roomIndex];
      if (!room) return null;

      let definition = areaSurfaceByKey(surfaceKey);
      let catalogIndex = AREA_SURFACE_CATALOG.findIndex(
        (row) => row.key === surfaceKey,
      );

      if (!definition && isCustomSurfaceKey(surfaceKey)) {
        const entry = resolveCustomSubstrateById(room.prep_work, surfaceKey);
        if (!entry) return null;
        definition = customSubstrateSurfaceDefinition(entry);
        catalogIndex =
          900 +
          resolveCustomSubstrates(room.prep_work).findIndex(
            (row) => row.id === surfaceKey,
          );
      }

      if (!definition) return null;

      const painterRate =
        (company.labor_rates as Record<string, number>).painter ?? 45;
      const defaultUnitRate =
        definition.rate_type === "each"
          ? 75
          : definition.rate_type === "linear"
            ? 1.5
            : painterRate;

      const defaults = paintDefaultsRecord(paintDefaults);
      const defaultRow = defaults[definition.paint_default_type];
      const sqFt = sqFtForAreaSurfaceKey(
        surfaceKey as AreaSurfaceKey,
        room,
        closet,
      );

      return {
        surface_key: surfaceKey,
        surface_type: definition.surface_type,
        sq_ft: sqFt > 0 ? sqFt : 0,
        coats: defaultRow?.coats ?? room.coats,
        unit_rate: defaultUnitRate,
        rate_type: definition.rate_type,
        room_index: roomIndex,
        room_id: room.id,
        is_optional: false,
        sort_order: catalogIndex >= 0 ? catalogIndex : 0,
        notes:
          surfaceKey === "closet" && closet
            ? encodeClosetNotes(closet)
            : null,
        company_paint_product_id: defaultRow?.company_paint_product_id ?? null,
        product_override: false,
        gallons_estimated: null,
      };
    },
    [company.labor_rates, paintDefaults, rooms],
  );

  const applyWallDimensions = useCallback(
    (index: number) => {
      const room = rooms[index];
      if (!room) return;

      const hasDims =
        (room.length_ft ?? 0) > 0 &&
        (room.width_ft ?? 0) > 0 &&
        (room.height_ft ?? 0) > 0;
      const totalWalls = totalWallSqFtFromRoom(room);
      if (totalWalls > 0) {
        updateArea(index, { sq_ft: totalWalls });
      }

      setSurfaces((prev) => {
        let next = stripLegacyAggregateSurfaces(prev, index);

        if (hasDims) {
          for (const key of AUTO_ENABLED_SURFACE_KEYS) {
            if (!findAreaSurface(next, index, key)) {
              const built = buildSurfaceForKey(index, key);
              if (built) next = [...next, built];
            }
          }
        }

        const closetDims = closetDimsForRoom(next, index);
        if (
          closetDims &&
          !findAreaSurface(next, index, "closet-ceiling")
        ) {
          const builtCeiling = buildSurfaceForKey(
            index,
            "closet-ceiling",
            closetDims,
          );
          if (builtCeiling) next = [...next, builtCeiling];
        }

        return next.map((surface) => {
          if (surface.room_index !== index) return surface;
          const key = surface.surface_key as AreaSurfaceKey | undefined;
          const clearedNotes = clearDerivedSurfaceEstimates(surface.notes);
          if (!key) {
            return withGallonsEstimated(
              { ...surface, notes: clearedNotes },
              company,
              productsById,
              jobType,
            );
          }
          if (ROOM_SYNC_SURFACE_KEYS.includes(key)) {
            const sqFt = sqFtForAreaSurfaceKey(key, room);
            return withGallonsEstimated(
              { ...surface, sq_ft: sqFt, notes: clearedNotes },
              company,
              productsById,
              jobType,
            );
          }
          if (CLOSET_SYNC_SURFACE_KEYS.includes(key) && closetDims) {
            const sqFt = sqFtForAreaSurfaceKey(key, room, closetDims);
            return withGallonsEstimated(
              { ...surface, sq_ft: sqFt, notes: clearedNotes },
              company,
              productsById,
              jobType,
            );
          }
          return withGallonsEstimated(
            { ...surface, notes: clearedNotes },
            company,
            productsById,
            jobType,
          );
        });
      });
      queueMicrotask(() => regenerateAreaLineItems(index));
    },
    [
      buildSurfaceForKey,
      company,
      productsById,
      rooms,
      updateArea,
      regenerateAreaLineItems,
    ],
  );

  const addSurfaceToArea = useCallback(
    (
      roomIndex: number,
      surfaceKey: string,
      closet?: ClosetDimensions | null,
    ) => {
      if (findAreaSurface(surfaces, roomIndex, surfaceKey)) return;
      const built = buildSurfaceForKey(roomIndex, surfaceKey, closet);
      if (!built) return;
      setSurfaces((prev) => [
        ...prev,
        withGallonsEstimated(built, company, productsById, jobType),
      ]);
    },
    [buildSurfaceForKey, company, productsById, surfaces],
  );

  const removeSurfaceFromArea = useCallback(
    (roomIndex: number, surfaceKey: string) => {
      setSurfaces((prev) =>
        prev.filter(
          (surface) =>
            !(
              surface.room_index === roomIndex &&
              surface.surface_key === surfaceKey
            ),
        ),
      );
    },
    [],
  );

  const removeClosetSurfaces = useCallback(
    (roomIndex: number) => {
      setSurfaces((prev) =>
        prev.filter(
          (surface) =>
            !(
              surface.room_index === roomIndex &&
              (surface.surface_key === "closet" ||
                surface.surface_key === "closet-ceiling")
            ),
        ),
      );
    },
    [],
  );

  const addClosetSurfaces = useCallback(
    (roomIndex: number, closet: ClosetDimensions) => {
      addSurfaceToArea(roomIndex, "closet", closet);
      addSurfaceToArea(roomIndex, "closet-ceiling", closet);
    },
    [addSurfaceToArea],
  );

  const addCustomSubstrateToArea = useCallback(
    (roomIndex: number, label: string) => {
      const room = rooms[roomIndex];
      if (!room) return;
      const { prepWork } = addCustomSubstrate(room.prep_work, label);
      updateArea(roomIndex, { prep_work: prepWork });
    },
    [rooms, updateArea],
  );

  const removeCustomSubstrateFromArea = useCallback(
    (roomIndex: number, substrateId: CustomSubstrateId) => {
      const room = rooms[roomIndex];
      if (!room) return;
      removeSurfaceFromArea(roomIndex, substrateId);
      updateArea(roomIndex, {
        prep_work: removeCustomSubstrate(room.prep_work, substrateId),
      });
      queueMicrotask(() => regenerateAreaLineItems(roomIndex));
    },
    [rooms, updateArea, removeSurfaceFromArea, regenerateAreaLineItems],
  );

  const toggleAreaSurface = useCallback(
    (
      roomIndex: number,
      surfaceKey: string,
      enabled: boolean,
      closet?: ClosetDimensions | null,
    ) => {
      if (surfaceKey === "closet-ceiling") return;

      if (surfaceKey === "closet") {
        const hasCloset = Boolean(
          findAreaSurface(surfaces, roomIndex, "closet"),
        );
        if (enabled && !hasCloset && closet) {
          addClosetSurfaces(roomIndex, closet);
        } else if (!enabled && hasCloset) {
          removeClosetSurfaces(roomIndex);
        }
        queueMicrotask(() => regenerateAreaLineItems(roomIndex));
        return;
      }

      const hasSurface = Boolean(
        findAreaSurface(surfaces, roomIndex, surfaceKey),
      );
      if (enabled && !hasSurface) {
        addSurfaceToArea(roomIndex, surfaceKey, closet);
      } else if (!enabled && hasSurface) {
        removeSurfaceFromArea(roomIndex, surfaceKey);
      }
      queueMicrotask(() => regenerateAreaLineItems(roomIndex));
    },
    [
      addClosetSurfaces,
      addSurfaceToArea,
      removeClosetSurfaces,
      removeSurfaceFromArea,
      surfaces,
      regenerateAreaLineItems,
    ],
  );

  const surfacesForArea = useCallback(
    (roomIndex: number) =>
      surfaces.filter((surface) => surface.room_index === roomIndex),
    [surfaces],
  );

  const updateSurface = useCallback(
    (
      roomIndex: number,
      surfaceKey: string,
      patch: Partial<SurfaceInput>,
    ) => {
      setSurfaces((prev) => {
        const next = prev.map((surface) => {
          if (
            surface.room_index !== roomIndex ||
            surface.surface_key !== surfaceKey
          ) {
            return surface;
          }
          const notes = shouldRecalculateDerivedEstimates(patch)
            ? clearDerivedSurfaceEstimates(
                patch.notes !== undefined ? patch.notes : surface.notes,
              )
            : patch.notes !== undefined
              ? patch.notes
              : surface.notes;
          const updated = { ...surface, ...patch, notes };
          return withGallonsEstimated(updated, company, productsById, jobType);
        });
        surfacesRef.current = next;
        return next;
      });
      queueMicrotask(() => regenerateAreaLineItems(roomIndex));
    },
    [company, productsById, jobType, regenerateAreaLineItems],
  );

  const updateSubstrateCoats = useCallback(
    (roomIndex: number, substrateId: AreaSubstrateId, coats: number) => {
      const room = rooms[roomIndex];
      if (!room) return;

      const substrate =
        findSubstrateDefinition(room.prep_work, substrateId) ??
        substrateById(substrateId);
      if (!substrate) return;

      const keys = new Set(listKeysForSubstrate(substrate));

      setSurfaces((prev) => {
        const next = prev.map((surface) => {
          if (surface.room_index !== roomIndex) return surface;
          const key = surface.surface_key as AreaSurfaceKey | undefined;
          if (!key || !keys.has(key)) return surface;
          const updated = {
            ...surface,
            coats,
            notes: clearDerivedSurfaceEstimates(surface.notes),
          };
          return withGallonsEstimated(updated, company, productsById, jobType);
        });
        surfacesRef.current = next;
        return next;
      });
      queueMicrotask(() => regenerateAreaLineItems(roomIndex));
    },
    [rooms, company, productsById, jobType, regenerateAreaLineItems],
  );

  const resetSurfaceProduct = useCallback(
    (roomIndex: number, surfaceKey: string) => {
      const room = rooms[roomIndex];
      const definition =
        areaSurfaceByKey(surfaceKey) ??
        (room
          ? resolveCustomSubstrateById(room.prep_work, surfaceKey)
            ? customSubstrateSurfaceDefinition(
                resolveCustomSubstrateById(room.prep_work, surfaceKey)!,
              )
            : null
          : null);
      if (!definition) return;
      const defaults = paintDefaultsRecord(paintDefaults);
      const def = defaults[definition.paint_default_type];
      const existing = findAreaSurface(surfaces, roomIndex, surfaceKey);
      updateSurface(roomIndex, surfaceKey, {
        company_paint_product_id: def?.company_paint_product_id ?? null,
        product_override: false,
        coats: def?.coats,
        ...(definition.key === "window"
          ? {
              notes: mergeSurfaceOverrideNotes(existing?.notes, {
                primerProductId: null,
              }),
            }
          : {}),
      });
    },
    [paintDefaults, surfaces, updateSurface],
  );

  const updateClosetSurface = useCallback(
    (roomIndex: number, closet: ClosetDimensions) => {
      const room = rooms[roomIndex];
      if (!room) return;

      setSurfaces((prev) => {
        const hasCloset = findAreaSurface(prev, roomIndex, "closet");
        let next = prev;
        if (!hasCloset) {
          const builtCloset = buildSurfaceForKey(roomIndex, "closet", closet);
          const builtCeiling = buildSurfaceForKey(
            roomIndex,
            "closet-ceiling",
            closet,
          );
          if (builtCloset) next = [...next, builtCloset];
          if (builtCeiling) next = [...next, builtCeiling];
        }

        return next.map((surface) => {
          if (surface.room_index !== roomIndex) return surface;
          if (surface.surface_key === "closet") {
            return withGallonsEstimated(
              {
                ...surface,
                sq_ft: sqFtForAreaSurfaceKey("closet", room, closet),
                notes: encodeClosetNotes(closet),
              },
              company,
              productsById,
              jobType,
            );
          }
          if (surface.surface_key === "closet-ceiling") {
            return withGallonsEstimated(
              {
                ...surface,
                sq_ft: sqFtForAreaSurfaceKey("closet-ceiling", room, closet),
              },
              company,
              productsById,
              jobType,
            );
          }
          return surface;
        });
      });
      queueMicrotask(() => regenerateAreaLineItems(roomIndex));
    },
    [
      buildSurfaceForKey,
      company,
      productsById,
      regenerateAreaLineItems,
      rooms,
    ],
  );

  const isAreaDirty = useCallback(
    (index: number) => {
      if (!editingSnapshot || editingSnapshot.index !== index) return false;
      const room = rooms[index];
      if (!room) return false;
      const current = snapshotAreaState(
        index,
        room,
        surfaces,
        paintDefaults,
      );
      return !snapshotsEqual(editingSnapshot, current);
    },
    [editingSnapshot, rooms, surfaces, paintDefaults],
  );

  const revertAreaEdits = useCallback(
    (index: number) => {
      if (!editingSnapshot || editingSnapshot.index !== index) return;
      setRooms((prev) =>
        prev.map((room, i) =>
          i === index ? { ...editingSnapshot.room } : room,
        ),
      );
      setSurfaces((prev) => [
        ...prev.filter((surface) => surface.room_index !== index),
        ...editingSnapshot.surfaces.map((surface) => ({ ...surface })),
      ]);
      setPaintDefaults(editingSnapshot.paintDefaults.map((row) => ({ ...row })));
      queueMicrotask(() => regenerateAreaLineItems(index));
      setEditingSnapshot(null);
    },
    [editingSnapshot, regenerateAreaLineItems],
  );

  const saveAreaEdits = useCallback(
    (index: number) => {
      applyWallDimensions(index);
      queueMicrotask(() => {
        regenerateAreaLineItems(index);
      });
      setEditingSnapshot(null);
      setEditingAreaIndex(null);
    },
    [applyWallDimensions, regenerateAreaLineItems],
  );

  const openAreaEditor = useCallback(
    (index: number) => {
      const room = rooms[index];
      if (!room) return;
      setEditingSnapshot(
        snapshotAreaState(index, room, surfaces, paintDefaults),
      );
      setEditingAreaIndex(index);
    },
    [rooms, surfaces, paintDefaults],
  );

  const closeAreaEditor = useCallback(() => {
    setEditingSnapshot(null);
    setEditingAreaIndex(null);
  }, []);

  const replacePaintDefaults = useCallback(
    (defaults: QuotePaintDefaultInput[]) => {
      const normalized = normalizeQuotePaintDefaults(defaults);
      paintDefaultsRef.current = normalized;
      setPaintDefaults(normalized);
      setSurfaces((prev) => {
        const next = applyDefaultsToSurfaces(prev, normalized, false).map(
          (surface) => withGallonsEstimated(surface, company, productsById, jobType),
        );
        surfacesRef.current = next;
        return next;
      });
      queueMicrotask(() => regenerateAllLineItems());
    },
    [company, productsById, jobType, regenerateAllLineItems],
  );

  const getDraftChildren = useCallback(
    (lineItemsOverride?: LineItemInput[]) => ({
      rooms: roomsRef.current,
      surfaces: surfacesRef.current,
      lineItems: lineItemsOverride ?? lineItemsRef.current,
      paintDefaults: normalizeQuotePaintDefaults(paintDefaultsRef.current),
    }),
    [],
  );

  return {
    rooms,
    surfaces,
    lineItems,
    pricedLineItems: markedLineItems,
    setLineItems,
    areaSubtotals,
    areaCostBreakdowns,
    editingAreaPreviewBreakdown,
    editingAreaPreviewLineItems,
    editingAreaWorkItemsRollup,
    itemsSubtotal,
    customQuoteLineItems,
    addCustomQuoteLineItem,
    updateCustomQuoteLineItem,
    removeCustomQuoteLineItem,
    toggleAreaIncluded,
    toggleCustomQuoteLineItemIncluded,
    defaultMarkupPct,
    pricingSummary,
    coverage,
    editingAreaIndex,
    addAreaFromTemplate,
    duplicateArea,
    updateArea,
    deleteArea,
    applyWallDimensions,
    toggleAreaSurface,
    surfacesForArea,
    updateSurface,
    updateClosetSurface,
    resetSurfaceProduct,
    paintDefaults,
    paintProducts,
    isAreaDirty,
    revertAreaEdits,
    saveAreaEdits,
    updateSubstrateMargin,
    updateSubstrateCoats,
    updateSubstrateProductivity,
    resetSubstrateProductivity,
    addCustomSubstrateToArea,
    removeCustomSubstrateFromArea,
    openAreaEditor,
    closeAreaEditor,
    replacePaintDefaults,
    regenerateAllLineItems,
    getDraftChildren,
    buildAllLineItems,
  };
}