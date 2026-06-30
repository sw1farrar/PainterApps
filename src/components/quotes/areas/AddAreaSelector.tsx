"use client";

import { useState } from "react";
import { Plus, Search } from "lucide-react";
import { AppDrawer } from "@/components/portal/AppDrawer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { COMMON_AREAS } from "@/lib/quotes/area-helpers";
import { cn } from "@/lib/utils";

type AddAreaSelectorProps = {
  onAdd: (name: string) => void;
  onOpenCustom: () => void;
};

export function AddAreaSelector({ onAdd, onOpenCustom }: AddAreaSelectorProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const filtered = COMMON_AREAS.filter((name) =>
    name.toLowerCase().includes(query.trim().toLowerCase()),
  );

  const handlePick = (name: string) => {
    onAdd(name);
    setOpen(false);
    setQuery("");
  };

  return (
    <>
      <Button type="button" size="sm" onClick={() => setOpen(true)}>
        <Plus className="h-4 w-4" />
        Add area
      </Button>

      <AppDrawer
        open={open}
        onOpenChange={setOpen}
        title="Add area"
        description="Pick a common room or create a custom name."
        footer={
          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={() => {
              setOpen(false);
              onOpenCustom();
            }}
          >
            Custom area (full editor)
          </Button>
        }
      >
        <div className="space-y-4">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search rooms…"
              className="pl-9"
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            {filtered.map((name) => (
              <button
                key={name}
                type="button"
                onClick={() => handlePick(name)}
                className={cn(
                  "rounded-lg border border-border bg-muted/30 px-3 py-3 text-left text-sm font-medium",
                  "hover:border-primary/50 hover:bg-primary/5",
                )}
              >
                {name}
              </button>
            ))}
          </div>
          {query.trim() &&
          !filtered.some(
            (name) => name.toLowerCase() === query.trim().toLowerCase(),
          ) ? (
            <Button
              type="button"
              variant="secondary"
              className="w-full"
              onClick={() => handlePick(query.trim())}
            >
              Add &ldquo;{query.trim()}&rdquo;
            </Button>
          ) : null}
        </div>
      </AppDrawer>
    </>
  );
}