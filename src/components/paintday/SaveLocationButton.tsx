"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Bookmark } from "lucide-react";

export function SaveLocationButton({
  zip,
  signedIn,
}: {
  zip: string;
  signedIn: boolean;
}) {
  const t = useTranslations();
  if (!signedIn) {
    return (
      <Button asChild variant="outline">
        <Link href={`/login?next=/paintday/${zip}`}>
          <Bookmark className="size-4" />
          {t("cta.signInToSave")}
        </Link>
      </Button>
    );
  }
  return (
    <Button asChild variant="outline">
      <Link href={`/app/locations?zip=${zip}`}>
        <Bookmark className="size-4" />
        {t("paintday.save")}
      </Link>
    </Button>
  );
}
