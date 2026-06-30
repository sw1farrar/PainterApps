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
  paintDefaultTypeForSurfaceKey,
  paintDefaultsRecord,
} from "@/lib/quotes/paint-defaults";
import { DEFAULT_PRODUCT_COVERAGE_SQFT_PER_GALLON } from "@/lib/paint-library/coverage";
import { computeSurfaceGallons } from "@/lib/quotes/surface-gallons";
import {
  computeAreaBidPrice,
  computeAreaCostBreakdown,
  type AreaCostBreakdown,
} from "@/lib/quotes/area-pricing";
import {
  areaNameBase,
  buildIndexMapAfterDelete,
  nextSequencedAreaName,
} from "@/lib/quotes/area-helpers";
import {
  buildLineItemsForArea,
  regenerateLineItems,
} from "@/lib/quotes/estimation";
import { getCompanyPricingSummary } from "@/lib/quotes/estimate-from-rooms";
import { lineItemsSubtotal } from "@/lib/quotes/pricing";
import { toggleScopeLine } from "@/lib/quotes/scope-library";
import type {
  Company,
  QuoteJobType,
  QuotePaintDefault,
  QuoteRoom,
  QuoteSurface,
} from "@/types/database";
import type { QuoteSurfaceKind } from "@/types/database";

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
  /** Project gross margin % (defaults from estimate defaults; overridable per quote). */
  projectGrossMarginPct?: number | null;
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
  projectGrossMarginPct = null,
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
      grossMarginPct: projectGrossMarginPct ?? undefined,
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

  const itemsSubtotal = useMemo(
    () =>
      lineItemsSubtotal(
        lineItems.map((item, i) => ({
          id: item.id ?? `temp-${i}`,
          quote_id: "",
          type: item.type,
          description: item.description,
          qty: item.qty,
          unit_cost: item.unit_cost,
          markup: item.markup ?? 0,
          source: item.source ?? "manual",
          room_id: item.room_id ?? null,
          is_optional: item.is_optional ?? false,
          sort_order: item.sort_order ?? i,
          company_paint_product_id: item.company_paint_product_id ?? null,
          paint_role: item.paint_role ?? null,
        })),
        { excludeOptional: true },
      ),
    [lineItems],
  );

  const buildAllLineItems = useCallback(() => {
    if (!rooms.length) return [];
    return regenerateLineItems(estimateContext, lineItems);
  }, [estimateContext, lineItems, rooms.length]);

  const regenerateAllLineItems = useCallback(() => {
    const next = buildAllLineItems();
    setLineItems(next);
    return next;
  }, [buildAllLineItems]);

  const regenerateAreaLineItems = useCallback(
    (roomIndex: number) => {
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
    },
    [estimateContext, rooms],
  );

  const addAreaFromTemplate = useCallback((baseName: string) => {
    let newIndex = -1;
    let addedName = "";

    setRooms((prev) => {
      const name = nextSequencedAreaName(baseName, prev);
      newIndex = prev.length;
      addedName = name;
      return [...prev, { ...EMPTY_ROOM, name, sort_order: newIndex }];
    });

    if (newIndex >= 0) {
      toast.success(`Added ${addedName}`);
    }
  }, []);

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

  const updateArea = useCallback((index: number, patch: Partial<RoomInput>) => {
    setRooms((prev) =>
      prev.map((room, i) => (i === index ? { ...room, ...patch } : room)),
    );
  }, []);

  const deleteArea = useCallback((index: number) => {
    const map = buildIndexMapAfterDelete(rooms.length, index);
    setRooms((prev) =>
      prev
        .filter((_, i) => i !== index)
        .map((room, i) => ({ ...room, sort_order: i })),
    );
    setSurfaces((prev) =>
      prev
        .filter((surface) => surface.room_index !== index)
        .map((surface) => {
          if (surface.room_index === undefined) return surface;
          const mapped = map.get(surface.room_index);
          return mapped !== undefined
            ? { ...surface, room_index: mapped }
            : surface;
        }),
    );
    setLineItems((prev) =>
      prev.filter(
        (item) =>
          item.room_index !== index && item.room_id !== rooms[index]?.id,
      ),
    );
    setEditingAreaIndex(null);
    setEditingSnapshot(null);
  }, [rooms]);

  const buildSurfaceForKey = useCallback(
    (
      roomIndex: number,
      surfaceKey: AreaSurfaceKey,
      closet?: ClosetDimensions | null,
    ): SurfaceInput | null => {
      const room = rooms[roomIndex];
      const definition = areaSurfaceByKey(surfaceKey);
      if (!room || !definition) return null;

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
      const sqFt = sqFtForAreaSurfaceKey(surfaceKey, room, closet);
      const catalogIndex = AREA_SURFACE_CATALOG.findIndex(
        (row) => row.key === surfaceKey,
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
          if (!key) {
            return withGallonsEstimated(surface, company, productsById, jobType);
          }
          if (ROOM_SYNC_SURFACE_KEYS.includes(key)) {
            const sqFt = sqFtForAreaSurfaceKey(key, room);
            return withGallonsEstimated(
              { ...surface, sq_ft: sqFt },
              company,
              productsById,
              jobType,
            );
          }
          if (CLOSET_SYNC_SURFACE_KEYS.includes(key) && closetDims) {
            const sqFt = sqFtForAreaSurfaceKey(key, room, closetDims);
            return withGallonsEstimated(
              { ...surface, sq_ft: sqFt },
              company,
              productsById,
              jobType,
            );
          }
          return withGallonsEstimated(surface, company, productsById, jobType);
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
      surfaceKey: AreaSurfaceKey,
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
    (roomIndex: number, surfaceKey: AreaSurfaceKey) => {
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

  const toggleAreaSurface = useCallback(
    (
      roomIndex: number,
      surfaceKey: AreaSurfaceKey,
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
      surfaceKey: AreaSurfaceKey,
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
          const updated = { ...surface, ...patch };
          return withGallonsEstimated(updated, company, productsById, jobType);
        });
        surfacesRef.current = next;
        return next;
      });
      queueMicrotask(() => regenerateAreaLineItems(roomIndex));
    },
    [company, productsById, regenerateAreaLineItems],
  );

  const setPaintDefault = useCallback(
    (
      surfaceType: QuoteSurfaceKind,
      productId: string | null,
      coats?: number,
    ) => {
      const defaultPatch: QuotePaintDefaultInput = {
        surface_type: surfaceType,
        company_paint_product_id: productId,
        coats: coats ?? 2,
      };

      setPaintDefaults((prev) => {
        const next = normalizeQuotePaintDefaults(prev).map((row) =>
          row.surface_type === surfaceType
            ? {
                ...row,
                company_paint_product_id: productId,
                coats: coats ?? row.coats,
              }
            : row,
        );
        paintDefaultsRef.current = next;
        return next;
      });

      setSurfaces((prev) => {
        const next = applyDefaultsToSurfaces(
          prev.map((surface) => {
            if (surface.product_override) return surface;
            const kind = paintDefaultTypeForSurfaceKey(
              surface.surface_key,
              surface.surface_type,
            );
            if (kind !== surfaceType) return surface;
            return {
              ...surface,
              company_paint_product_id: productId,
              coats: coats ?? surface.coats,
              product_override: false,
            };
          }),
          [defaultPatch],
          true,
        ).map((surface) => withGallonsEstimated(surface, company, productsById, jobType));
        surfacesRef.current = next;
        return next;
      });
    },
    [company, productsById],
  );

  const resetSurfaceProduct = useCallback(
    (roomIndex: number, surfaceKey: AreaSurfaceKey) => {
      const definition = areaSurfaceByKey(surfaceKey);
      if (!definition) return;
      const defaults = paintDefaultsRecord(paintDefaults);
      const def = defaults[definition.paint_default_type];
      updateSurface(roomIndex, surfaceKey, {
        company_paint_product_id: def?.company_paint_product_id ?? null,
        product_override: false,
        coats: def?.coats,
      });
    },
    [paintDefaults, updateSurface],
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

  const toggleScopeCategory = useCallback(
    (roomIndex: number, labels: string[], enabled: boolean) => {
      const room = rooms[roomIndex];
      if (!room) return;
      let prepWork = room.prep_work ?? "";
      for (const label of labels) {
        prepWork = toggleScopeLine(prepWork, label, enabled);
      }
      updateArea(roomIndex, { prep_work: prepWork });
    },
    [rooms, updateArea],
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
    setLineItems,
    areaSubtotals,
    areaCostBreakdowns,
    itemsSubtotal,
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
    setPaintDefault,
    resetSurfaceProduct,
    toggleScopeCategory,
    paintDefaults,
    paintProducts,
    isAreaDirty,
    revertAreaEdits,
    saveAreaEdits,
    openAreaEditor,
    closeAreaEditor,
    replacePaintDefaults,
    regenerateAllLineItems,
    getDraftChildren,
    buildAllLineItems,
  };
}