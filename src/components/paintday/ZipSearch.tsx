"use client";

import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import { Search } from "lucide-react";
import { searchPlacesAction } from "@/app/actions/places";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { matchMetros, mergePlaces } from "@/lib/geo/match-metros";
import type { GeoPlace } from "@/lib/weather/types";
import type { ZipSearchCopy } from "@/lib/paintday/copy-types";
import { formatZip, isUsZip } from "@/lib/utils";

export type { ZipSearchCopy };

const PM_OFF = {
  autoComplete: "off" as const,
  autoCorrect: "off" as const,
  autoCapitalize: "none" as const,
  spellCheck: false as const,
  "data-1p-ignore": true,
  "data-lpignore": "true",
  "data-bwignore": "true",
  "data-form-type": "other",
  "data-dashlane-disabled": "true",
};

export function ZipSearch({
  initial = "",
  size = "default",
  copy,
}: {
  initial?: string;
  size?: "default" | "hero" | "compact";
  copy: ZipSearchCopy;
}) {
  const router = useRouter();
  const listId = useId();
  const [value, setValue] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [matches, setMatches] = useState<GeoPlace[]>([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const seq = useRef(0);
  const committed = useRef(formatZip(initial));
  const suppressOpen = useRef(Boolean(initial));

  function go(zip: string) {
    if (!isUsZip(zip)) return;
    setError(null);
    setOpen(false);
    setMatches([]);
    committed.current = zip;
    suppressOpen.current = true;
    setValue(zip);
    router.push(`/paintday/${zip}`);
  }

  useEffect(() => {
    const q = value.trim();
    if (q.length < 1) {
      setMatches([]);
      setOpen(false);
      return;
    }
    if (suppressOpen.current && formatZip(q) === committed.current) {
      setMatches([]);
      setOpen(false);
      return;
    }
    const local = matchMetros(q);
    setMatches(local);
    setOpen(local.length > 0);
    setActive(0);
    if (q.length < 2 && !/^\d+$/.test(q)) return;

    const id = ++seq.current;
    const timer = window.setTimeout(async () => {
      setPending(true);
      try {
        const remote = await searchPlacesAction(q);
        if (seq.current !== id) return;
        const next = mergePlaces(matchMetros(q), remote);
        setMatches(next);
        setOpen(next.length > 0);
      } finally {
        if (seq.current === id) setPending(false);
      }
    }, 180);
    return () => window.clearTimeout(timer);
  }, [value]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const zip = formatZip(value);
    if (isUsZip(zip)) {
      go(zip);
      return;
    }
    const pick = matches[active] ?? matches[0];
    if (pick?.zip && isUsZip(pick.zip)) {
      go(pick.zip);
      return;
    }
    setError(copy.invalidZip);
  }

  return (
    <form
      onSubmit={submit}
      className={`relative w-full ${size === "compact" ? "max-w-none" : "max-w-lg"}`}
      autoComplete="off"
      data-block-password-manager="true"
      data-1p-ignore="true"
      data-lpignore="true"
      data-bwignore="true"
      data-form-type="other"
    >
      <label htmlFor="place-search" className="sr-only">
        {copy.searchLabel}
      </label>
      <div className="flex gap-2">
        <Input
          id="place-search"
          name="place-query"
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={open}
          aria-controls={listId}
          aria-activedescendant={open ? `${listId}-${active}` : undefined}
          inputMode="search"
          enterKeyHint="search"
          placeholder={copy.searchPlaceholder}
          value={value}
          onChange={(e) => {
            suppressOpen.current = false;
            setValue(e.target.value);
            setError(null);
          }}
          onFocus={() => {
            if (suppressOpen.current) return;
            if (matches.length) setOpen(true);
          }}
          onBlur={() => {
            window.setTimeout(() => setOpen(false), 160);
          }}
          onKeyDown={(e) => {
            if (!open || !matches.length) return;
            if (e.key === "ArrowDown") {
              e.preventDefault();
              setActive((i) => (i + 1) % matches.length);
            } else if (e.key === "ArrowUp") {
              e.preventDefault();
              setActive((i) => (i - 1 + matches.length) % matches.length);
            } else if (e.key === "Escape") {
              setOpen(false);
            }
          }}
          className={
            size === "hero" ? "h-12 text-base" : size === "compact" ? "h-8 text-sm" : "h-10"
          }
          aria-invalid={Boolean(error)}
          {...PM_OFF}
        />
        <Button
          type="submit"
          aria-busy={pending}
          className={
            size === "hero"
              ? "h-12 paint-gradient border-0 px-5 text-white"
              : size === "compact"
                ? "h-8 paint-gradient border-0 px-3 text-white"
                : "paint-gradient border-0 text-white"
          }
        >
          <Search className="size-4" />
          {copy.searchCta}
        </Button>
      </div>
      {open && matches.length > 0 ? (
        <ul
          id={listId}
          role="listbox"
          className="absolute z-50 mt-2 w-full overflow-hidden rounded-xl border border-border bg-card text-sm shadow-lg"
        >
          {matches.map((p, i) => (
            <li key={`${p.zip}-${p.lat}`} role="option" aria-selected={i === active}>
              <button
                id={`${listId}-${i}`}
                type="button"
                tabIndex={-1}
                className={`flex w-full items-baseline justify-between gap-3 px-3 py-2.5 text-left ${
                  i === active ? "bg-muted" : "hover:bg-muted/70"
                }`}
                onMouseEnter={() => setActive(i)}
                onClick={() => go(p.zip)}
                {...PM_OFF}
              >
                <span>
                  {p.city}, {p.state}
                </span>
                <span className="font-mono text-xs text-muted-foreground">
                  {p.zip}
                </span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}
      {error ? (
        <p className="mt-2 text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}
    </form>
  );
}
