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
          ? "border-blue-600 bg-blue-600 text-white shadow-sm hover:bg-blue-700"
          : "border-slate-200 bg-white/95 text-slate-700 shadow-sm hover:border-blue-300 hover:text-blue-700",
        className,
      )}
    >
      <Icon className="h-3.5 w-3.5" />
      {label}
    </button>
  );
}