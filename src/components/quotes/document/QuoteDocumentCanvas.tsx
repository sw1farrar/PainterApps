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
          "shadow-[0_24px_80px_-12px_rgba(15,23,42,0.35)]",
          className,
        )}
      >
        <div className="aspect-[8.5/11] max-h-[calc(100dvh-11rem)] w-full overflow-hidden rounded-sm bg-white ring-1 ring-slate-200/80">
          <div className="h-full overflow-y-auto overscroll-contain">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}