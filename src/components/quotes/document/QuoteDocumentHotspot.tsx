"use client";

import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type QuoteDocumentHotspotProps = {
  icon: LucideIcon;
  label: string;
  onClick: () => void;
  variant?: "primary" | "subtle";
  className?: string;
};

export function QuoteDocumentHotspot({
  icon: Icon,
  label,
  onClick,
  variant = "subtle",
  className,
}: QuoteDocumentHotspotProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition",
        variant === "primary"
          ? "border-primary bg-primary text-primary-foreground shadow-theme-sm hover:bg-primary/90"
          : "border-border bg-card text-foreground shadow-theme-sm hover:border-primary/40 hover:text-primary",
        className,
      )}
    >
      <Icon className="h-3.5 w-3.5" />
      {label}
    </button>
  );
}