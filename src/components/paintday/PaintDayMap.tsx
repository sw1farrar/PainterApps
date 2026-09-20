"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import "maplibre-gl/dist/maplibre-gl.css";
import type { MapScorePoint } from "@/lib/paintday/map-scores";
import states from "@/data/geo/us-states.json";

function colorFor(score: number) {
  if (score >= 85) return "#10b981";
  if (score >= 70) return "#14b8a6";
  if (score >= 50) return "#eab308";
  if (score >= 30) return "#f97316";
  return "#ef4444";
}

function scoreCollection(points: MapScorePoint[]) {
  return {
    type: "FeatureCollection" as const,
    features: points.map((p) => ({
      type: "Feature" as const,
      properties: {
        zip: p.zip,
        city: p.city,
        state: p.state,
        score: p.score,
        color: colorFor(p.score),
        highF: p.highF,
        precipChance: p.precipChance,
      },
      geometry: {
        type: "Point" as const,
        coordinates: [p.lng, p.lat] as [number, number],
      },
    })),
  };
}

export function PaintDayMap({ points }: { points: MapScorePoint[] }) {
  const el = useRef<HTMLDivElement>(null);
  const mapRef = useRef<import("maplibre-gl").Map | undefined>(undefined);
  const pointsRef = useRef(points);
  pointsRef.current = points;
  const router = useRouter();
  const { resolvedTheme } = useTheme();
  const dark = resolvedTheme !== "light";

  useEffect(() => {
    const src = mapRef.current?.getSource("scores") as
      | { setData: (data: GeoJSON.GeoJSON) => void }
      | undefined;
    src?.setData(scoreCollection(points));
  }, [points]);

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
                "circle-opacity": 0.22,
              },
            },
            {
              id: "scores-dots",
              type: "circle",
              source: "scores",
              paint: {
                "circle-radius": 5.5,
                "circle-color": ["get", "color"],
                "circle-stroke-width": 1.4,
                "circle-stroke-color": dark ? "#0e141c" : "#fff",
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
          highF: number;
          precipChance: number;
        };
        popup
          .setLngLat(e.lngLat)
          .setHTML(
            `<div style="font:600 12px Geist,system-ui,sans-serif;padding:2px 2px 0;color:var(--foreground)">
              ${props.city}, ${props.state} ${props.zip}<br/>
              <span style="color:${props.color};font-size:20px;letter-spacing:-0.04em">${props.score}</span>
              <div style="margin-top:4px;font:500 11px Geist,system-ui,sans-serif;color:var(--muted-foreground)">
                High ${Math.round(Number(props.highF))}°F · Rain ${Math.round(Number(props.precipChance))}%
              </div>
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
                style={{ background: colorFor(s) }}
              />
              {s}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
