"use client";

import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { EmptyBoxIllustration } from "@/components/illustrations";

export default function ErrorPage({
  reset,
}: {
  error: Error;
  reset: () => void;
}) {
  const t = useTranslations("empty");
  return (
    <div className="mx-auto max-w-md px-4 py-24 text-center">
      <EmptyBoxIllustration />
      <h1 className="mt-6 text-2xl font-semibold">{t("errorTitle")}</h1>
      <p className="mt-2 text-sm text-muted-foreground">{t("error")}</p>
      <Button className="mt-6" onClick={reset}>
        {t("retry")}
      </Button>
    </div>
  );
}
