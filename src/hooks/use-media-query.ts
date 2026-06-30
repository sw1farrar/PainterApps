"use client";

import { useEffect, useState } from "react";

export function useMediaQuery(query: string): boolean | undefined {
  const [matches, setMatches] = useState<boolean | undefined>(undefined);

  useEffect(() => {
    const mq = window.matchMedia(query);
    setMatches(mq.matches);
    const onChange = () => setMatches(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [query]);

  return matches;
}

/** Defaults to desktop during SSR so page routes are used until mobile is confirmed. */
export function useIsDesktop(): boolean {
  const matches = useMediaQuery("(min-width: 768px)");
  return matches ?? true;
}