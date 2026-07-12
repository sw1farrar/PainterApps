"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type QuoteDocumentCanvasProps = {
  children: ReactNode;
  className?: string;
};

/** Letter-ratio customer document frame (8.5 × 11). */
export function QuoteDocumentCanvas({
  children,
  className,
}: QuoteDocumentCanvasProps) {
  return (
    <div className="flex h-full w-full min-h-0 items-center justify-center p-2 sm:p-4">
      <div
        className={cn(
          "quote-document-canvas relative w-full max-w-[min(100%,42rem)]",
          "shadow-theme-md",
          className,
        )}
      >
        <div className="aspect-[8.5/11] max-h-[calc(100dvh-11rem)] w-full overflow-hidden rounded-sm bg-card ring-1 ring-border/80">
          <div className="h-full overflow-y-auto overscroll-contain">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}