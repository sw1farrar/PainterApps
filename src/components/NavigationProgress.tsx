"use client";

import { usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

function isInternalNavigation(anchor: HTMLAnchorElement, pathname: string) {
  const href = anchor.getAttribute("href");
  if (!href || href.startsWith("#") || href.startsWith("mailto:") || href.startsWith("tel:")) {
    return false;
  }

  if (anchor.target === "_blank" || anchor.hasAttribute("download")) {
    return false;
  }

  try {
    const url = new URL(href, window.location.href);
    if (url.origin !== window.location.origin) {
      return false;
    }

    const current = `${pathname}${window.location.search}`;
    const next = `${url.pathname}${url.search}`;
    return next !== current;
  } catch {
    return false;
  }
}

export function NavigationProgress() {
  const pathname = usePathname();
  const [progress, setProgress] = useState(0);
  const [visible, setVisible] = useState(false);
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const isFirstPathnameRef = useRef(true);
  const isNavigatingRef = useRef(false);

  const clearTimers = useCallback(() => {
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];
  }, []);

  const schedule = useCallback((fn: () => void, delay: number) => {
    const id = setTimeout(fn, delay);
    timersRef.current.push(id);
  }, []);

  const complete = useCallback(() => {
    clearTimers();
    setProgress(100);

    schedule(() => {
      setVisible(false);
      setProgress(0);
      isNavigatingRef.current = false;
    }, 220);
  }, [clearTimers, schedule]);

  const completeRef = useRef(complete);
  completeRef.current = complete;

  const start = useCallback(() => {
    if (isNavigatingRef.current) return;

    isNavigatingRef.current = true;
    clearTimers();
    setVisible(true);
    setProgress(12);

    schedule(() => setProgress(35), 80);
    schedule(() => setProgress(58), 200);
    schedule(() => setProgress(78), 400);
    schedule(() => setProgress(90), 700);
    schedule(() => {
      if (isNavigatingRef.current) {
        completeRef.current();
      }
    }, 8000);
  }, [clearTimers, schedule]);

  useEffect(() => {
    const handleClick = (event: MouseEvent) => {
      if (event.defaultPrevented) return;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;

      const anchor = (event.target as HTMLElement).closest("a");
      if (!anchor || !isInternalNavigation(anchor, pathname)) return;

      start();
    };

    document.addEventListener("click", handleClick, true);
    return () => document.removeEventListener("click", handleClick, true);
  }, [pathname, start]);

  useEffect(() => {
    if (isFirstPathnameRef.current) {
      isFirstPathnameRef.current = false;
      return;
    }

    if (isNavigatingRef.current) {
      complete();
      return;
    }

    start();
    complete();
  }, [pathname, start, complete]);

  useEffect(() => () => clearTimers(), [clearTimers]);

  if (!visible) return null;

  return (
    <div
      className="pointer-events-none fixed inset-x-0 top-0 z-[9999] h-0.5"
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={progress}
      aria-label="Page loading"
    >
      <div
        className="h-full bg-blue-500 shadow-[0_0_10px_rgba(43,108,184,0.55)] transition-[width] duration-300 ease-out motion-reduce:transition-none"
        style={{ width: `${progress}%` }}
      />
    </div>
  );
}