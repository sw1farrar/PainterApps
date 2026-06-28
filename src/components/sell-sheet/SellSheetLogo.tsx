"use client";

import { useEffect, useState } from "react";
import { trimTransparentEdges } from "@/lib/images/trim-transparent";

type SellSheetLogoProps = {
  src: string;
  className?: string;
};

export function SellSheetLogo({ src, className }: SellSheetLogoProps) {
  const [displaySrc, setDisplaySrc] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    trimTransparentEdges(src)
      .then((result) => {
        if (!cancelled) setDisplaySrc(result.src);
      })
      .catch(() => {
        if (!cancelled) setDisplaySrc(src);
      });

    return () => {
      cancelled = true;
    };
  }, [src]);

  if (!displaySrc) return null;

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={displaySrc} alt="" className={className} />
  );
}