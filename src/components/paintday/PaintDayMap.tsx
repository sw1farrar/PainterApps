"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import "maplibre-gl/dist/maplibre-gl.css";
import { formatClock } from "@/lib/paintday/crew-plan";
import { windowLine } from "@/lib/paintday/format";
import {
  mapDotColors,
  scoreColorHex,
  type MapScorePoint,
} from "@/lib/paintday/map-scores";
import states from "@/data/geo/us-states.json";

function esc(value: unknown) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function iconId(left: string, right: string) {
  return `dot-${left.slice(1)}-${right.slice(1)}`;
}

function drawDot(left: string, right: string, stroke: string) {
  const s = 64;
  const canvas = document.createElement("canvas");
  canvas.width = s;
  canvas.height = s;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  const cx = 32;
  const cy = 32;
  const r = 26;
  ctx.beginPath();
  ctx.moveTo(cx, cy);
  ctx.arc(cx, cy, r, Math.PI / 2, (3 * Math.PI) / 2, false);
  ctx.closePath();
  ctx.fillStyle = left;
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(cx, cy);
  ctx.arc(cx, cy, r, (3 * Math.PI) / 2, Math.PI / 2, false);
  ctx.closePath();
  ctx.fillStyle = right;
  ctx.fill();
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.strokeStyle = stroke;
  ctx.lineWidth = 5;
  ctx.stroke();
  return ctx.getImageData(0, 0, s, s);
}

function scoreCollection(points: MapScorePoint[]) {
  return {
    type: "FeatureCollection" as const,
    features: points.map((p) => {
      const dots = mapDotColors(p);
      return {
        type: "Feature" as const,
        properties: {
          zip: p.zip,
          city: p.city,
          state: p.state,
          score: dots.split || !p.amWet ? p.score : 15,
          color: dots.left,
          colorRight: dots.right,
          split: dots.split ? 1 : 0,
          icon: iconId(dots.left, dots.right),
          highF: p.highF,
          precipChance: p.precipChance,
          summaryKey:
            p.amWet && (p.hoursOpen ?? 0) === 0
              ? "do-not-paint-rain"
              : (p.summaryKey ?? ""),
          startHour: p.startHour ?? "",
          wrapHour: p.wrapHour ?? "",
          rainHour: p.rainHour ?? "",
          hoursOpen: p.hoursOpen ?? 0,
          amWet: p.amWet ? 1 : 0,
          pmWet: p.pmWet ? 1 : 0,
        },
        geometry: {
          type: "Point" as const,
          coordinates: [p.lng, p.lat] as [number, number],
        },
      };
    }),
  };
}

function ensureIcons(
  map: import("maplibre-gl").Map,
  points: MapScorePoint[],
  stroke: string,
) {
  const needed = new Set<string>();
  for (const p of points) {
    const { left, right } = mapDotColors(p);
    needed.add(`${left}|${right}`);
  }
  for (const key of needed) {
    const [left, right] = key.split("|");
    const id = iconId(left, right);
    if (map.hasImage(id)) continue;
    const img = drawDot(left, right, stroke);
    if (!img) continue;
    map.addImage(id, {
      width: img.width,
      height: img.height,
      data: Uint8Array.from(img.data),
    });
  }
}

export function PaintDayMap({
  points,
  summaries,
}: {
  points: MapScorePoint[];
  summaries: Record<string, string>;
}) {
  const el = useRef<HTMLDivElement>(null);
  const mapRef = useRef<import("maplibre-gl").Map | undefined>(undefined);
  const pointsRef = useRef(points);
  pointsRef.current = points;
  const reasonRef = useRef<(key: string) => string>(() => "");
  reasonRef.current = (key: string) => (key ? (summaries[key] ?? "") : "");
  const router = useRouter();
  const { resolvedTheme } = useTheme();
  const dark = resolvedTheme !== "light";

  useEffect(() => {
    const map = mapRef.current;
    const src = map?.getSource("scores") as
      | { setData: (data: GeoJSON.GeoJSON) => void }
      | undefined;
    if (map) ensureIcons(map, points, dark ? "#0e141c" : "#fff");
    src?.setData(scoreCollection(points));
  }, [points, dark]);

  useEffect(() => {
    const node = el.current;
    if (!node) return;
    let cancelled = false;
    let map: import("maplibre-gl").Map | undefined;
    let popup: import("maplibre-gl").Popup | undefined;
    let ro: ResizeObserver | undefined;

    (async () => {
      const maplibregl = (await import("maplibre-gl")).default;
      if (cancelled || !el.current) return;

      const water = dark ? "#10161f" : "#d9e4eb";
      const land = dark ? "#2a3548" : "#f3efe8";
      const border = dark ? "#c5d0de" : "#4f4a42";

      map = new maplibregl.Map({
        container: el.current,
        style: {
          version: 8,
          sources: {
            states: {
              type: "geojson",
              data: states as GeoJSON.GeoJSON,
            },
            scores: {
              type: "geojson",
              data: scoreCollection(pointsRef.current),
            },
          },
          layers: [
            {
              id: "background",
              type: "background",
              paint: { "background-color": water },
            },
            {
              id: "states-fill",
              type: "fill",
              source: "states",
              paint: {
                "fill-color": land,
                "fill-opacity": 1,
              },
            },
            {
              id: "states-line",
              type: "line",
              source: "states",
              paint: {
                "line-color": border,
                "line-width": 1.05,
                "line-opacity": 0.85,
              },
            },
            {
              id: "scores-glow",
              type: "circle",
              source: "scores",
              paint: {
                "circle-radius": 13,
                "circle-color": ["get", "color"],
                "circle-opacity": 0.2,
              },
            },
            {
              id: "scores-icons",
              type: "symbol",
              source: "scores",
              filter: ["==", ["get", "split"], 1],
              layout: {
                "icon-image": ["get", "icon"],
                "icon-size": 0.42,
                "icon-allow-overlap": true,
                "icon-ignore-placement": true,
              },
            },
            {
              id: "scores-dots",
              type: "circle",
              source: "scores",
              paint: {
                "circle-radius": 6,
                "circle-color": ["get", "color"],
                "circle-stroke-width": 1.4,
                "circle-stroke-color": dark ? "#0e141c" : "#fff",
                "circle-opacity": [
                  "case",
                  ["==", ["get", "split"], 1],
                  0,
                  1,
                ],
              },
            },
          ],
        },
        center: [-96.6, 38.2],
        zoom: 3.55,
        minZoom: 2.6,
        maxZoom: 8,
        attributionControl: false,
      });

      map.addControl(
        new maplibregl.NavigationControl({ showCompass: false }),
        "bottom-right",
      );

      popup = new maplibregl.Popup({
        closeButton: false,
        closeOnClick: false,
        offset: 14,
        className: "paintday-popup",
      });

      map.on("load", () => {
        mapRef.current = map;
        if (map) ensureIcons(map, pointsRef.current, dark ? "#0e141c" : "#fff");
        map?.resize();
        map?.fitBounds(
          [
            [-124.9, 24.4],
            [-66.7, 49.4],
          ],
          { padding: { top: 28, bottom: 28, left: 20, right: 20 }, duration: 0 },
        );
      });

      map.on("mousemove", "scores-dots", (e) => {
        if (!map || !e.features?.[0] || !popup) return;
        map.getCanvas().style.cursor = "pointer";
        const props = e.features[0].properties as {
          city: string;
          state: string;
          zip: string;
          score: number;
          color: string;
          colorRight: string;
          split: number;
          highF: number;
          precipChance: number;
          summaryKey: string;
          startHour: number | string;
          wrapHour: number | string;
          rainHour: number | string;
          hoursOpen: number;
          amWet: number;
          pmWet: number;
        };
        const score = Number(props.score);
        const start =
          props.startHour === "" || props.startHour == null
            ? null
            : Number(props.startHour);
        const wrap =
          props.wrapHour === "" || props.wrapHour == null
            ? null
            : Number(props.wrapHour);
        const rain =
          props.rainHour === "" || props.rainHour == null
            ? null
            : Number(props.rainHour);
        const amWet = Number(props.amWet) === 1;
        const pmWet = Number(props.pmWet) === 1;
        const hoursOpen = Number(props.hoursOpen) || 0;
        const closed = amWet && hoursOpen === 0;
        const drizzlePm = amWet && !pmWet && hoursOpen > 0;
        const window = !closed ? windowLine(start, wrap, rain) : "";
        const reason = closed
          ? reasonRef.current("do-not-paint-rain")
          : score < 70
            ? reasonRef.current(String(props.summaryKey ?? ""))
            : "";
        const pop = Math.round(Number(props.precipChance));
        const rainBit = drizzlePm && rain != null
          ? `Drizzle ${formatClock(rain)} · window ${pop}%`
          : rain != null
            ? `Rain ${formatClock(rain)}`
            : `Window rain ${pop}%`;
        const headline = closed
          ? `<span style="color:${esc(props.color)};font-size:15px">Morning rain · day closed</span>`
          : drizzlePm
            ? `<span style="color:${esc(props.color)};font-size:20px;letter-spacing:-0.04em">${esc(score)}</span>
              <div style="margin-top:2px;font:500 11px Geist,system-ui,sans-serif;color:var(--muted-foreground)">AM drizzle · PM open</div>`
          : pmWet
            ? `<span style="color:${esc(props.color)};font-size:20px;letter-spacing:-0.04em">${esc(score)}</span>
              <div style="margin-top:2px;font:500 11px Geist,system-ui,sans-serif;color:var(--muted-foreground)">AM open · PM rain</div>`
            : `<span style="color:${esc(props.color)};font-size:20px;letter-spacing:-0.04em">${esc(score)}</span>`;
        popup
          .setLngLat(e.lngLat)
          .setHTML(
            `<div style="font:600 12px Geist,system-ui,sans-serif;padding:2px 2px 0;color:var(--foreground)">
              ${esc(props.city)}, ${esc(props.state)} ${esc(props.zip)}<br/>
              ${headline}
              ${
                window
                  ? `<div style="margin-top:4px;font:500 11px Geist,system-ui,sans-serif;color:var(--foreground)">Paint ${esc(window)}</div>`
                  : ""
              }
              <div style="margin-top:4px;font:500 11px Geist,system-ui,sans-serif;color:var(--muted-foreground)">
                High ${Math.round(Number(props.highF))}°F · ${esc(rainBit)}
              </div>
              ${
                reason
                  ? `<div style="margin-top:4px;max-width:14rem;font:500 11px Geist,system-ui,sans-serif;color:${esc(props.color)}">${esc(reason)}</div>`
                  : ""
              }
            </div>`,
          )
          .addTo(map);
      });
      map.on("mouseleave", "scores-dots", () => {
        if (!map) return;
        map.getCanvas().style.cursor = "";
        popup?.remove();
      });
      map.on("click", "scores-dots", (e) => {
        const zip = e.features?.[0]?.properties?.zip as string | undefined;
        if (zip) router.push(`/paintday/${zip}`);
      });

      ro = new ResizeObserver(() => map?.resize());
      ro.observe(el.current);
    })();

    return () => {
      cancelled = true;
      mapRef.current = undefined;
      ro?.disconnect();
      popup?.remove();
      map?.remove();
    };
  }, [dark, router]);

  return (
    <div className="relative overflow-hidden rounded-2xl border border-border">
      <div
        ref={el}
        className="h-[420px] w-full md:h-[560px]"
        role="img"
        aria-label="United States PaintDay map"
      />
      <div className="pointer-events-none absolute bottom-4 left-4 rounded-xl border border-border bg-background/90 px-3 py-2 text-xs backdrop-blur">
        <p className="mb-1 font-medium">PaintDay</p>
        <div className="flex gap-2">
          {[90, 75, 55, 40, 15].map((s) => (
            <span key={s} className="flex items-center gap-1">
              <i
                className="inline-block size-2 rounded-full"
                style={{ background: scoreColorHex(s) }}
              />
              {s}
            </span>
          ))}
        </div>
        <p className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <i
              className="inline-block size-3 overflow-hidden rounded-full"
              style={{
                background:
                  "linear-gradient(90deg, #14b8a6 0 50%, #ef4444 50% 100%)",
              }}
            />
            AM | PM rain
          </span>
          <span className="inline-flex items-center gap-1">
            <i
              className="inline-block size-3 overflow-hidden rounded-full"
              style={{
                background:
                  "linear-gradient(90deg, #ef4444 0 50%, #14b8a6 50% 100%)",
              }}
            />
            AM drizzle | PM
          </span>
          <span className="inline-flex items-center gap-1">
            <i
              className="inline-block size-3 rounded-full"
              style={{ background: "#ef4444" }}
            />
            AM rain = day off
          </span>
        </p>
      </div>
    </div>
  );
}
