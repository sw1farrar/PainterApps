"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

export function EnvelopeSheet({
  onClose,
  labelledBy,
  ariaLabel,
  layer = 50,
  children,
}: {
  onClose: () => void;
  labelledBy?: string;
  ariaLabel?: string;
  layer?: number;
  children: (close: () => void) => React.ReactNode;
}) {
  const [leaving, setLeaving] = useState(false);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  function close() {
    setLeaving(true);
  }

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key !== "Escape") return;
      const layers = [
        ...document.querySelectorAll("[data-envelope-layer]"),
      ].map((el) => Number(el.getAttribute("data-envelope-layer")));
      if (layers.length && Math.max(...layers) > layer) return;
      e.preventDefault();
      setLeaving(true);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [layer]);

  useEffect(() => {
    if (!leaving) return;
    const reduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    const ms = reduced ? 80 : 420;
    const timer = window.setTimeout(() => onCloseRef.current(), ms);
    return () => window.clearTimeout(timer);
  }, [leaving]);

  return (
    <div
      className={cn("fixed inset-0 overflow-hidden")}
      style={{ zIndex: layer }}
      data-envelope-layer={layer}
      role="presentation"
    >
      <div
        className={cn(
          "absolute inset-0 bg-black/50",
          leaving ? "envelope-dim-out" : "envelope-dim",
        )}
        onClick={close}
      />
      <div className="pointer-events-none absolute inset-0 flex items-end justify-center">
        <div
          className={cn(
            "pointer-events-auto flex h-dvh w-full flex-col",
            leaving ? "envelope-sheet-out" : "envelope-sheet",
          )}
          role="dialog"
          aria-modal="true"
          aria-labelledby={labelledBy}
          aria-label={ariaLabel}
          onAnimationEnd={(e) => {
            if (e.target !== e.currentTarget) return;
            if (leaving) onCloseRef.current();
          }}
        >
          <div className="envelope-flap mx-auto w-[min(100%,42rem)] shrink-0" />
          {children(close)}
        </div>
      </div>
    </div>
  );
}
