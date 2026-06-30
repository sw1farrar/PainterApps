"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { usePathname } from "next/navigation";

type PortalNavigationContextValue = {
  isNavigating: boolean;
  pendingHref: string | null;
  startNavigation: (href: string) => void;
};

const PortalNavigationContext =
  createContext<PortalNavigationContextValue | null>(null);

function normalizeHref(href: string) {
  try {
    const url = new URL(href, window.location.origin);
    return `${url.pathname}${url.search}`;
  } catch {
    return href;
  }
}

function currentLocation(pathname: string) {
  if (typeof window === "undefined") return pathname;
  return `${pathname}${window.location.search}`;
}

const PROGRESS_SHOW_DELAY_MS = 120;
const CONTENT_SETTLE_DELAY_MS = 80;

export function PortalNavigationProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [isNavigating, setIsNavigating] = useState(false);
  const [pendingHref, setPendingHref] = useState<string | null>(null);
  const [showProgress, setShowProgress] = useState(false);
  const [progress, setProgress] = useState(0);
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const isNavigatingRef = useRef(false);
  const pendingHrefRef = useRef<string | null>(null);
  const isFirstPathnameRef = useRef(true);

  const clearTimers = useCallback(() => {
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];
  }, []);

  const schedule = useCallback((fn: () => void, delay: number) => {
    const id = setTimeout(fn, delay);
    timersRef.current.push(id);
  }, []);

  const beginNavigation = useCallback(
    (href: string | null) => {
      clearTimers();
      isNavigatingRef.current = true;
      pendingHrefRef.current = href;
      setPendingHref(href);
      setIsNavigating(true);
      setShowProgress(false);
      setProgress(0);

      schedule(() => {
        if (!isNavigatingRef.current) return;
        setShowProgress(true);
        setProgress(14);
      }, PROGRESS_SHOW_DELAY_MS);

      schedule(() => setProgress(32), PROGRESS_SHOW_DELAY_MS + 60);
      schedule(() => setProgress(52), PROGRESS_SHOW_DELAY_MS + 160);
      schedule(() => setProgress(72), PROGRESS_SHOW_DELAY_MS + 320);
      schedule(() => setProgress(86), PROGRESS_SHOW_DELAY_MS + 520);
      schedule(() => setProgress(94), PROGRESS_SHOW_DELAY_MS + 900);
      schedule(() => {
        if (isNavigatingRef.current) setProgress(98);
      }, PROGRESS_SHOW_DELAY_MS + 4500);
    },
    [clearTimers, schedule],
  );

  const completeNavigation = useCallback(() => {
    if (!isNavigatingRef.current) return;

    clearTimers();
    isNavigatingRef.current = false;
    pendingHrefRef.current = null;
    setProgress(100);
    schedule(() => {
      setIsNavigating(false);
      setPendingHref(null);
      setShowProgress(false);
      setProgress(0);
    }, 160);
  }, [clearTimers, schedule]);

  const startNavigation = useCallback(
    (href: string) => {
      const next = normalizeHref(href);
      if (isSameDestination(currentLocation(pathname), next)) return;
      beginNavigation(next);
    },
    [beginNavigation, pathname],
  );

  useEffect(() => {
    const handleProgrammatic = () => beginNavigation(null);

    const handleClick = (event: MouseEvent) => {
      if (event.defaultPrevented) return;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
        return;
      }

      const anchor = (event.target as HTMLElement).closest("a");
      if (!anchor) return;

      const href = anchor.getAttribute("href");
      if (
        !href ||
        href.startsWith("#") ||
        href.startsWith("mailto:") ||
        href.startsWith("tel:")
      ) {
        return;
      }

      if (anchor.target === "_blank" || anchor.hasAttribute("download")) {
        return;
      }

      try {
        const url = new URL(href, window.location.origin);
        if (url.origin !== window.location.origin) return;

        const current = currentLocation(pathname);
        const next = `${url.pathname}${url.search}`;
        if (next === current) return;

        beginNavigation(next);
      } catch {
        // Ignore malformed hrefs.
      }
    };

    window.addEventListener("app:navigation-start", handleProgrammatic);
    document.addEventListener("click", handleClick, true);
    return () => {
      window.removeEventListener("app:navigation-start", handleProgrammatic);
      document.removeEventListener("click", handleClick, true);
    };
  }, [beginNavigation, pathname]);

  useEffect(() => {
    if (isFirstPathnameRef.current) {
      isFirstPathnameRef.current = false;
      return;
    }

    if (!isNavigatingRef.current) return;

    const pending = pendingHrefRef.current;
    if (!pending) {
      schedule(() => completeNavigation(), CONTENT_SETTLE_DELAY_MS);
      return;
    }

    const current = normalizeHref(pathname);
    const target = normalizeHref(pending);
    if (current === target) {
      schedule(() => completeNavigation(), CONTENT_SETTLE_DELAY_MS);
    }
  }, [pathname, completeNavigation, schedule]);

  useEffect(() => () => clearTimers(), [clearTimers]);

  return (
    <PortalNavigationContext.Provider
      value={{ isNavigating, pendingHref, startNavigation }}
    >
      {showProgress ? (
        <div
          className="pointer-events-none fixed inset-x-0 top-0 z-[9999] h-0.5 opacity-90"
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
      ) : null}
      {children}
    </PortalNavigationContext.Provider>
  );
}

function isSameDestination(current: string, next: string) {
  return normalizeHref(current) === normalizeHref(next);
}

export function usePortalNavigation() {
  const context = useContext(PortalNavigationContext);
  if (!context) {
    throw new Error(
      "usePortalNavigation must be used within PortalNavigationProvider",
    );
  }
  return context;
}

export function useOptionalPortalNavigation() {
  return useContext(PortalNavigationContext);
}