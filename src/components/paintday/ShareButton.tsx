"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Link2 } from "lucide-react";

export function ShareButton({ zip }: { zip: string }) {
  const t = useTranslations("paintday");
  const [copied, setCopied] = useState(false);

  async function copy() {
    const url = window.location.href;
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      return;
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  }

  return (
    <Button variant="ghost" onClick={copy}>
      <Link2 className="size-4" />
      {copied ? t("copied") : t("share")}
    </Button>
  );
}
