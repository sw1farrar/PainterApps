"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatZip, isUsZip } from "@/lib/utils";

export function ZipSearch({
  initial = "",
  size = "default",
}: {
  initial?: string;
  size?: "default" | "hero";
}) {
  const t = useTranslations("paintday");
  const router = useRouter();
  const [value, setValue] = useState(initial);
  const [error, setError] = useState<string | null>(null);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const zip = formatZip(value);
    if (!isUsZip(zip)) {
      setError(t("invalidZip"));
      return;
    }
    setError(null);
    router.push(`/paintday/${zip}`);
  }

  return (
    <form onSubmit={submit} className="w-full max-w-lg">
      <label htmlFor="zip-search" className="sr-only">
        {t("searchLabel")}
      </label>
      <div className="flex gap-2">
        <Input
          id="zip-search"
          inputMode="numeric"
          autoComplete="postal-code"
          placeholder={t("searchPlaceholder")}
          value={value}
          onChange={(e) => {
            setValue(formatZip(e.target.value) || e.target.value);
            setError(null);
          }}
          className={size === "hero" ? "h-12 text-base" : "h-10"}
          aria-invalid={Boolean(error)}
        />
        <Button
          type="submit"
          className={
            size === "hero"
              ? "h-12 paint-gradient border-0 px-5 text-white"
              : "paint-gradient border-0 text-white"
          }
        >
          <Search className="size-4" />
          {t("searchCta")}
        </Button>
      </div>
      {error ? (
        <p className="mt-2 text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}
    </form>
  );
}
