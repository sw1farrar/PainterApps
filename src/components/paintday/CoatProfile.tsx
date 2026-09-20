"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";

const PROFILES = ["latex", "duration", "latitude"] as const;

export function CoatProfile({
  zip,
  active,
}: {
  zip: string;
  active: string;
}) {
  const t = useTranslations("paintday");
  return (
    <div className="mt-4 flex flex-wrap gap-2 text-sm">
      {PROFILES.map((id) => (
        <Link
          key={id}
          href={id === "latex" ? `/paintday/${zip}` : `/paintday/${zip}?coat=${id}`}
          className={cn(
            "rounded-full border px-3 py-1",
            active === id
              ? "border-foreground bg-foreground text-background"
              : "border-border text-muted-foreground hover:text-foreground",
          )}
        >
          {t(`coat.${id}`)}
        </Link>
      ))}
    </div>
  );
}
