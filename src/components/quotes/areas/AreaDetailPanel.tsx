"use client";

import { useEffect, useRef } from "react";
import { Copy, Trash2 } from "lucide-react";
import { SurfaceRow } from "@/components/quotes/areas/SurfaceRow";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SURFACE_QUICK_ADD } from "@/lib/quotes/area-helpers";
import { estimateGallons } from "@/lib/quotes/pricing";
import { formatCurrency } from "@/lib/utils";
import type { LineItemInput, RoomInput, SurfaceInput } from "@/app/app/(portal)/quotes/actions";
import type { Company, QuoteRateType, QuoteSurfaceKind } from "@/types/database";

type AreaDetailPanelProps = {
  room: RoomInput;
  roomIndex: number;
  areaSubtotal: number;
  surfaces: { surface: SurfaceInput; index: number }[];
  lineItems: LineItemInput[];
  company: Company;
  coverage: number;
  rateSearch: string;
  onUpdateRoom: (patch: Partial<RoomInput>) => void;
  onApplyDimensions: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onAddSurface: (type: QuoteSurfaceKind, rateType: QuoteRateType) => void;
  onUpdateSurface: (surfaceIndex: number, patch: Partial<SurfaceInput>) => void;
  onRemoveSurface: (surfaceIndex: number) => void;
  onEditRoom: () => void;
};

export function AreaDetailPanel({
  room,
  roomIndex,
  areaSubtotal,
  surfaces,
  lineItems,
  company,
  coverage,
  rateSearch,
  onUpdateRoom,
  onApplyDimensions,
  onDuplicate,
  onDelete,
  onAddSurface,
  onUpdateSurface,
  onRemoveSurface,
  onEditRoom,
}: AreaDetailPanelProps) {
  const gallons = estimateGallons(room.sq_ft, room.coats, coverage);
  const lastAutoCalcKey = useRef<string>("");

  useEffect(() => {
    const { length_ft, width_ft, height_ft } = room;
    if (!length_ft || !width_ft || !height_ft) return;

    const key = `${length_ft}-${width_ft}-${height_ft}`;
    if (key === lastAutoCalcKey.current) return;

    const timer = setTimeout(() => {
      lastAutoCalcKey.current = key;
      onApplyDimensions();
    }, 400);

    return () => clearTimeout(timer);
  }, [room.length_ft, room.width_ft, room.height_ft, onApplyDimensions]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-foreground">{room.name}</h2>
          <p className="text-sm text-muted-foreground">
            Area {roomIndex + 1} · {formatCurrency(areaSubtotal)} bid
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" size="sm" variant="outline" onClick={onDuplicate}>
            <Copy className="h-4 w-4" />
            Duplicate
          </Button>
          <Button type="button" size="sm" variant="outline" onClick={onEditRoom}>
            Colors &amp; prep
          </Button>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="text-destructive"
            onClick={onDelete}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Measurements</CardTitle>
          <CardDescription>
            L × W × H auto-calculates wall sq ft. Override sq ft anytime.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="space-y-2">
              <Label>Length (ft)</Label>
              <Input
                type="number"
                min={0}
                value={room.length_ft ?? ""}
                onChange={(e) =>
                  onUpdateRoom({
                    length_ft: e.target.value ? Number(e.target.value) : null,
                  })
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Width (ft)</Label>
              <Input
                type="number"
                min={0}
                value={room.width_ft ?? ""}
                onChange={(e) =>
                  onUpdateRoom({
                    width_ft: e.target.value ? Number(e.target.value) : null,
                  })
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Height (ft)</Label>
              <Input
                type="number"
                min={0}
                value={room.height_ft ?? ""}
                onChange={(e) =>
                  onUpdateRoom({
                    height_ft: e.target.value ? Number(e.target.value) : null,
                  })
                }
              />
            </div>
          </div>
          <div className="flex flex-wrap items-end gap-3">
            <div className="min-w-[120px] flex-1 space-y-2">
              <Label>Square feet</Label>
              <Input
                type="number"
                min={0}
                value={room.sq_ft || ""}
                onChange={(e) =>
                  onUpdateRoom({ sq_ft: Number(e.target.value) })
                }
              />
            </div>
            <div className="min-w-[100px] space-y-2">
              <Label>Coats</Label>
              <Input
                type="number"
                min={1}
                value={room.coats}
                onChange={(e) =>
                  onUpdateRoom({ coats: Number(e.target.value) })
                }
              />
            </div>
            <Button type="button" variant="outline" onClick={onApplyDimensions}>
              Recalc walls
            </Button>
          </div>
          <p className="text-sm text-muted-foreground">
            ~{gallons} gallons · {room.surface_type} · {room.condition}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <CardTitle className="text-base">Surfaces</CardTitle>
              <CardDescription>
                Per-surface breakdown overrides room-level sq ft for this area.
              </CardDescription>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {SURFACE_QUICK_ADD.map(({ type, label, rate_type }) => (
                <Button
                  key={type}
                  type="button"
                  size="sm"
                  variant="secondary"
                  className="h-8 text-xs"
                  onClick={() => onAddSurface(type, rate_type)}
                >
                  + {label}
                </Button>
              ))}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {surfaces.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No surfaces yet — using room sq ft ({room.sq_ft || 0} sq ft) for
              estimates. Add walls, ceiling, or trim for detail.
            </p>
          ) : (
            surfaces.map(({ surface, index }) => (
              <SurfaceRow
                key={`surface-${index}-${surface.surface_type}`}
                surface={surface}
                company={company}
                rateSearch={rateSearch}
                onChange={(patch) => onUpdateSurface(index, patch)}
                onRemove={() => onRemoveSurface(index)}
              />
            ))
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Line items for this area</CardTitle>
        </CardHeader>
        <CardContent>
          {lineItems.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Regenerate from the breakdown panel to create items, or add manual
              lines.
            </p>
          ) : (
            <ul className="space-y-2">
              {lineItems.map((item, index) => (
                <li
                  key={`${item.description}-${index}`}
                  className="flex items-center justify-between gap-2 rounded-lg border border-border px-3 py-2 text-sm"
                >
                  <div className="flex min-w-0 items-center gap-2">
                    <Badge variant="outline" className="shrink-0 capitalize">
                      {item.source ?? "manual"}
                    </Badge>
                    <span className="truncate">{item.description}</span>
                  </div>
                  <span className="shrink-0 font-medium">
                    {formatCurrency(
                      item.qty *
                        item.unit_cost *
                        (1 + (item.markup ?? 0) / 100),
                    )}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}