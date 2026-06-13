"use client";

import * as React from "react";
import { Check, Loader2, MapPin } from "lucide-react";

import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { AddressFields } from "@/lib/address";

type AddressSuggestion = {
  placeId: string;
  label: string;
};

type AddressAutocompleteInputProps = {
  id: string;
  value: string;
  placeholder?: string;
  disabled?: boolean;
  onValueChange: (value: string) => void;
  onAddressSelect: (address: AddressFields) => void;
};

function createSessionToken() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `session-${Date.now()}`;
}

export function AddressAutocompleteInput({
  id,
  value,
  placeholder = "Start typing an address…",
  disabled = false,
  onValueChange,
  onAddressSelect,
}: AddressAutocompleteInputProps) {
  const [enabled, setEnabled] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [resolving, setResolving] = React.useState(false);
  const [open, setOpen] = React.useState(false);
  const [activeIndex, setActiveIndex] = React.useState(-1);
  const [suggestions, setSuggestions] = React.useState<AddressSuggestion[]>([]);
  const [verified, setVerified] = React.useState(false);
  const sessionRef = React.useRef(createSessionToken());
  const containerRef = React.useRef<HTMLDivElement>(null);
  const debounceRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  React.useEffect(() => {
    let cancelled = false;

    fetch("/api/address/config")
      .then((response) => response.json())
      .then((data: { enabled?: boolean }) => {
        if (!cancelled) setEnabled(Boolean(data.enabled));
      })
      .catch(() => {
        if (!cancelled) setEnabled(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  React.useEffect(() => {
    if (!enabled) return;

    function handlePointerDown(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
        setActiveIndex(-1);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [enabled]);

  const search = React.useCallback(
    async (query: string) => {
      if (!enabled || query.trim().length < 3) {
        setSuggestions([]);
        setOpen(false);
        return;
      }

      setLoading(true);
      try {
        const params = new URLSearchParams({
          q: query.trim(),
          session: sessionRef.current,
        });
        const response = await fetch(`/api/address/autocomplete?${params}`);
        const data = (await response.json()) as {
          suggestions?: AddressSuggestion[];
        };

        if (!response.ok) {
          setSuggestions([]);
          setOpen(false);
          return;
        }

        const next = data.suggestions ?? [];
        setSuggestions(next);
        setOpen(next.length > 0);
        setActiveIndex(-1);
      } finally {
        setLoading(false);
      }
    },
    [enabled],
  );

  const handleChange = (next: string) => {
    setVerified(false);
    onValueChange(next);

    if (!enabled) return;

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      void search(next);
    }, 300);
  };

  const selectSuggestion = async (suggestion: AddressSuggestion) => {
    setResolving(true);
    setOpen(false);
    setSuggestions([]);
    setActiveIndex(-1);

    try {
      const params = new URLSearchParams({
        placeId: suggestion.placeId,
        session: sessionRef.current,
      });
      const response = await fetch(`/api/address/place?${params}`);
      const data = (await response.json()) as {
        address?: AddressFields;
        error?: string;
      };

      if (!response.ok || !data.address) {
        onValueChange(suggestion.label);
        return;
      }

      onAddressSelect(data.address);
      setVerified(true);
      sessionRef.current = createSessionToken();
    } finally {
      setResolving(false);
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (!open || !suggestions.length) return;

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((index) => (index + 1) % suggestions.length);
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((index) =>
        index <= 0 ? suggestions.length - 1 : index - 1,
      );
      return;
    }

    if (event.key === "Enter" && activeIndex >= 0) {
      event.preventDefault();
      void selectSuggestion(suggestions[activeIndex]);
      return;
    }

    if (event.key === "Escape") {
      setOpen(false);
      setActiveIndex(-1);
    }
  };

  if (!enabled) {
    return (
      <Input
        id={id}
        value={value}
        onChange={(event) => onValueChange(event.target.value)}
        placeholder={placeholder}
        disabled={disabled}
      />
    );
  }

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <Input
          id={id}
          value={value}
          onChange={(event) => handleChange(event.target.value)}
          onFocus={() => {
            if (suggestions.length) setOpen(true);
          }}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled || resolving}
          aria-autocomplete="list"
          aria-expanded={open}
          aria-controls={`${id}-suggestions`}
        />
        <div className="pointer-events-none absolute inset-y-0 right-3 flex items-center gap-1 text-muted-foreground">
          {loading || resolving ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : verified ? (
            <Check className="h-4 w-4 text-emerald-400" aria-hidden />
          ) : null}
        </div>
      </div>

      {open && suggestions.length > 0 ? (
        <ul
          id={`${id}-suggestions`}
          role="listbox"
          className="absolute z-[100] mt-1 max-h-60 w-full overflow-auto rounded-md border border-border bg-popover p-1 text-popover-foreground shadow-xl ring-1 ring-black/20"
        >
          {suggestions.map((suggestion, index) => (
            <li key={suggestion.placeId} role="option" aria-selected={activeIndex === index}>
              <button
                type="button"
                className={cn(
                  "flex w-full items-start gap-2 rounded-sm px-3 py-2.5 text-left text-sm text-popover-foreground transition-colors hover:bg-accent hover:text-accent-foreground",
                  activeIndex === index && "bg-accent text-accent-foreground",
                )}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => void selectSuggestion(suggestion)}
              >
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-blue-300" />
                <span className="leading-snug">{suggestion.label}</span>
              </button>
            </li>
          ))}
          <li className="border-t border-border px-3 py-1.5 text-[10px] text-muted-foreground">
            Powered by Google
          </li>
        </ul>
      ) : null}

      <p className="mt-1.5 text-xs text-muted-foreground">
        Search verified US addresses as you type.
      </p>
    </div>
  );
}