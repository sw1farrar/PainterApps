"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Building2, ChevronDown, X } from "lucide-react";

import { Input } from "@/components/ui/input";
import { Z_LAYERS } from "@/lib/ui/z-layers";
import { cn } from "@/lib/utils";

type ManufacturerFilterComboboxProps = {
  manufacturers: string[];
  value: string;
  onChange: (value: string) => void;
  loading?: boolean;
  className?: string;
};

export function ManufacturerFilterCombobox({
  manufacturers,
  value,
  onChange,
  loading = false,
  className,
}: ManufacturerFilterComboboxProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) setQuery(value);
  }, [open, value]);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return manufacturers;
    return manufacturers.filter((name) => name.toLowerCase().includes(needle));
  }, [manufacturers, query]);

  const applyValue = (next: string) => {
    onChange(next);
    setQuery(next);
    setOpen(false);
  };

  const handleBlur = (event: React.FocusEvent) => {
    const next = event.relatedTarget as Node | null;
    if (next && containerRef.current?.contains(next)) return;
    setTimeout(() => setOpen(false), 120);
  };

  return (
    <div ref={containerRef} className={cn("relative min-w-0 flex-1", className)}>
      <Building2 className="pointer-events-none absolute left-2.5 top-1/2 z-10 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
      <Input
        role="combobox"
        aria-expanded={open}
        aria-controls="manufacturer-filter-listbox"
        aria-autocomplete="list"
        aria-label="Filter by manufacturer"
        value={open ? query : value}
        placeholder={loading ? "Loading…" : "Manufacturer"}
        disabled={loading}
        className={cn(
          "h-8 border-border/80 bg-transparent pl-8 text-xs",
          value ? "pr-14" : "pr-8",
        )}
        autoComplete="off"
        onChange={(event) => {
          setQuery(event.target.value);
          setOpen(true);
        }}
        onFocus={() => {
          setQuery(value);
          setOpen(true);
        }}
        onBlur={handleBlur}
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            setOpen(false);
            setQuery(value);
            return;
          }
          if (event.key === "Enter") {
            event.preventDefault();
            if (filtered.length === 1) {
              applyValue(filtered[0]!);
              return;
            }
            const exact = filtered.find(
              (name) => name.toLowerCase() === query.trim().toLowerCase(),
            );
            if (exact) {
              applyValue(exact);
              return;
            }
            if (query.trim()) applyValue(query.trim());
          }
        }}
      />

      {value ? (
        <button
          type="button"
          className="absolute right-7 top-1/2 -translate-y-1/2 rounded p-0.5 text-muted-foreground hover:text-foreground"
          aria-label="Clear manufacturer filter"
          onPointerDown={(event) => event.preventDefault()}
          onClick={() => applyValue("")}
        >
          <X className="h-3.5 w-3.5" />
        </button>
      ) : null}

      <button
        type="button"
        tabIndex={-1}
        className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground"
        aria-hidden
      >
        <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", open && "rotate-180")} />
      </button>

      {open && !loading ? (
        <ul
          id="manufacturer-filter-listbox"
          role="listbox"
          aria-label="Manufacturers"
          className={cn(
            "absolute left-0 right-0 mt-1 max-h-52 overflow-auto rounded-md border border-border bg-popover py-1 text-popover-foreground shadow-lg",
            Z_LAYERS.popover,
          )}
        >
          <li role="presentation">
            <button
              type="button"
              role="option"
              aria-selected={!value}
              className={cn(
                "flex w-full px-3 py-2 text-left text-xs hover:bg-muted/60",
                !value && "bg-muted/40 font-medium",
              )}
              onPointerDown={(event) => event.preventDefault()}
              onClick={() => applyValue("")}
            >
              All manufacturers
            </button>
          </li>
          {filtered.length ? (
            filtered.map((name) => (
              <li key={name} role="presentation">
                <button
                  type="button"
                  role="option"
                  aria-selected={value === name}
                  className={cn(
                    "flex w-full px-3 py-2 text-left text-xs hover:bg-muted/60",
                    value === name && "bg-muted/40 font-medium",
                  )}
                  onPointerDown={(event) => event.preventDefault()}
                  onClick={() => applyValue(name)}
                >
                  {name}
                </button>
              </li>
            ))
          ) : (
            <li
              role="presentation"
              className="px-3 py-3 text-xs text-muted-foreground"
            >
              {manufacturers.length === 0
                ? "No manufacturers available."
                : "No manufacturers match — press Enter to filter anyway."}
            </li>
          )}
        </ul>
      ) : null}
    </div>
  );
}