"use client";

import { useMemo, useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  newScopeEntryId,
  scopeLibraryForJobType,
  type ScopeLibraryItem,
  type SubstrateScopeEntry,
} from "@/lib/quotes/scope-library";
import { cn } from "@/lib/utils";
import type { QuoteJobType } from "@/types/database";

const CATEGORY_ORDER = ["prep", "paint", "extras"] as const;

const CATEGORY_LABELS: Record<ScopeLibraryItem["category"], string> = {
  prep: "Prep",
  paint: "Painting",
  extras: "Extras",
};

export type WorkItemScopeChangeOptions = {
  registerAreaCustomLabel?: string;
};

type WorkItemScopeEditorProps = {
  jobType: QuoteJobType;
  entries: SubstrateScopeEntry[];
  areaCustomScopeLabels?: string[];
  onChange: (
    entries: SubstrateScopeEntry[],
    options?: WorkItemScopeChangeOptions,
  ) => void;
  className?: string;
};

function ScopeCheckbox({
  label,
  checked,
  onToggle,
}: {
  label: string;
  checked: boolean;
  onToggle: (enabled: boolean) => void;
}) {
  return (
    <label
      className={cn(
        "flex cursor-pointer items-start gap-2 rounded-md px-1.5 py-1 transition-colors",
        "hover:bg-muted/30",
        checked && "bg-primary/5",
      )}
    >
      <input
        type="checkbox"
        className="mt-0.5 h-4 w-4 shrink-0 rounded border-border accent-primary"
        checked={checked}
        onChange={(e) => onToggle(e.target.checked)}
      />
      <span className="text-xs leading-snug text-foreground">{label}</span>
    </label>
  );
}

function isLibraryEntry(
  entry: SubstrateScopeEntry,
  libraryLabels: Set<string>,
): boolean {
  return !entry.custom && libraryLabels.has(entry.label);
}

export function WorkItemScopeEditor({
  jobType,
  entries,
  areaCustomScopeLabels = [],
  onChange,
  className,
}: WorkItemScopeEditorProps) {
  const [customLabel, setCustomLabel] = useState("");

  const library = useMemo(() => scopeLibraryForJobType(jobType), [jobType]);
  const libraryLabels = useMemo(
    () => new Set(library.map((item) => item.label)),
    [library],
  );

  const libraryByCategory = useMemo(() => {
    const grouped: Record<
      ScopeLibraryItem["category"],
      ScopeLibraryItem[]
    > = {
      prep: [],
      paint: [],
      extras: [],
    };
    for (const item of library) {
      grouped[item.category].push(item);
    }
    return grouped;
  }, [library]);

  const checkedLabels = useMemo(
    () => new Set(entries.map((entry) => entry.label)),
    [entries],
  );

  const toggleLibraryItem = (item: ScopeLibraryItem, enabled: boolean) => {
    if (enabled) {
      if (checkedLabels.has(item.label)) return;
      onChange([
        ...entries,
        {
          id: newScopeEntryId(),
          label: item.label,
          qty: 1,
          amount: 0,
        },
      ]);
      return;
    }

    onChange(
      entries.filter(
        (entry) =>
          !(entry.label === item.label && isLibraryEntry(entry, libraryLabels)),
      ),
    );
  };

  const toggleCustomScope = (label: string, enabled: boolean) => {
    if (enabled) {
      if (checkedLabels.has(label)) return;
      onChange([
        ...entries,
        {
          id: newScopeEntryId(),
          label,
          qty: 1,
          amount: 0,
          custom: true,
        },
      ]);
      return;
    }

    onChange(entries.filter((entry) => entry.label !== label));
  };

  const handleAddCustom = () => {
    const trimmed = customLabel.trim();
    if (!trimmed) return;

    if (!checkedLabels.has(trimmed)) {
      onChange(
        [
          ...entries,
          {
            id: newScopeEntryId(),
            label: trimmed,
            qty: 1,
            amount: 0,
            custom: true,
          },
        ],
        { registerAreaCustomLabel: trimmed },
      );
    } else {
      onChange(entries, { registerAreaCustomLabel: trimmed });
    }

    setCustomLabel("");
  };

  return (
    <div
      className={cn(
        "rounded-xl border border-border/70 bg-background/50 p-3 sm:p-4",
        className,
      )}
    >
      <div className="mb-3">
        <Label className="text-sm font-semibold text-foreground">
          Scope of work
        </Label>
        <p className="mt-0.5 text-[11px] text-muted-foreground">
          Check what applies to this work item. Custom scope lines are shared
          across the area.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {CATEGORY_ORDER.map((category) => {
          const items = libraryByCategory[category];
          return (
            <div key={category} className="min-w-0 space-y-2">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                {CATEGORY_LABELS[category]}
              </p>
              {items.length > 0 ? (
                <div className="space-y-1">
                  {items.map((item) => (
                    <ScopeCheckbox
                      key={item.id}
                      label={item.label}
                      checked={checkedLabels.has(item.label)}
                      onToggle={(enabled) =>
                        toggleLibraryItem(item, enabled)
                      }
                    />
                  ))}
                </div>
              ) : (
                <p className="px-1.5 text-[10px] text-muted-foreground/70">
                  —
                </p>
              )}
            </div>
          );
        })}
      </div>

      {areaCustomScopeLabels.length > 0 ? (
        <div className="mt-4 space-y-2 border-t border-border/40 pt-4">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            Custom
          </p>
          <div className="grid grid-cols-1 gap-x-4 gap-y-1 sm:grid-cols-3">
            {areaCustomScopeLabels.map((label) => (
              <ScopeCheckbox
                key={label}
                label={label}
                checked={checkedLabels.has(label)}
                onToggle={(enabled) => toggleCustomScope(label, enabled)}
              />
            ))}
          </div>
        </div>
      ) : null}

      <div className="mt-4 flex flex-col gap-2 border-t border-border/40 pt-4 sm:flex-row sm:items-center">
        <Input
          className="h-9 flex-1 text-sm"
          value={customLabel}
          onChange={(e) => setCustomLabel(e.target.value)}
          placeholder="Add custom scope for this area…"
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              handleAddCustom();
            }
          }}
        />
        <Button
          type="button"
          variant="secondary"
          size="sm"
          className="h-9 shrink-0 gap-1.5 sm:px-4"
          disabled={!customLabel.trim()}
          onClick={handleAddCustom}
        >
          <Plus className="h-3.5 w-3.5" />
          Add custom
        </Button>
      </div>
    </div>
  );
}