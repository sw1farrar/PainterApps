"use client";

import { useEffect, useState } from "react";
import type { AbstractIntlMessages } from "next-intl";
import { EnvelopeSheet } from "@/components/systems/EnvelopeSheet";
import { ClientIntl } from "@/components/i18n/ClientIntl";
import { ZipForecastBoard } from "@/components/paintday/ZipForecastBoard";
import { loadCityForecast } from "@/lib/paintday/city-forecast";
import type { UnitSystem } from "@/lib/units";
import type { Forecast, GeoPlace } from "@/lib/weather/types";

type CityForecast = {
  place: GeoPlace;
  forecast: Forecast;
  signedIn: boolean;
  units: UnitSystem;
  locale: string;
  messages: AbstractIntlMessages;
};

export function MapCityEnvelope({
  zip,
  date,
  city,
  state,
  closeLabel,
  loadingLabel,
  missLabel,
  onClose,
}: {
  zip: string;
  date: string;
  city: string;
  state: string;
  closeLabel: string;
  loadingLabel: string;
  missLabel: string;
  onClose: () => void;
}) {
  const [data, setData] = useState<CityForecast | null>(null);
  const [miss, setMiss] = useState(false);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  useEffect(() => {
    let cancel = false;
    setData(null);
    setMiss(false);
    loadCityForecast(zip).then((result) => {
      if (cancel) return;
      if (!result) setMiss(true);
      else setData(result);
    });
    return () => {
      cancel = true;
    };
  }, [zip]);

  return (
    <EnvelopeSheet onClose={onClose} labelledBy="map-city-title" layer={60}>
      {(close) => (
        <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-t-md border border-b-0 border-border bg-background shadow-2xl">
          <div className="flex shrink-0 items-center justify-between gap-3 border-b border-border px-4 py-3 sm:px-6">
            <div className="min-w-0">
              <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
                Paint Weather Day
              </p>
              <h2
                id="map-city-title"
                className="truncate text-2xl font-semibold tracking-tight"
              >
                {city}, {state}
              </h2>
            </div>
            <button
              type="button"
              onClick={close}
              className="shrink-0 rounded-md border border-border px-3 py-1.5 text-sm text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              {closeLabel}
            </button>
          </div>
          <div className="flex min-h-0 flex-1 flex-col">
            {data ? (
              <ClientIntl locale={data.locale} messages={data.messages}>
                <ZipForecastBoard
                  zip={zip}
                  place={data.place}
                  forecast={data.forecast}
                  signedIn={data.signedIn}
                  units={data.units}
                  dayQuery={date || undefined}
                  embedded
                />
              </ClientIntl>
            ) : (
              <div className="flex flex-1 flex-col gap-3 px-4 py-4 sm:px-6">
                <div className="h-8 max-w-xs animate-pulse rounded-md bg-muted" />
                <div className="h-20 animate-pulse rounded-xl bg-muted" />
                <div className="min-h-40 flex-1 animate-pulse rounded-xl bg-muted" />
                <p className="text-center text-sm text-muted-foreground">
                  {miss ? missLabel : loadingLabel}
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </EnvelopeSheet>
  );
}
