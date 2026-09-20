"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";

export function CompanyLogoField({
  companyId,
  initialUrl,
}: {
  companyId: string;
  initialUrl: string;
}) {
  const t = useTranslations("app");
  const [url, setUrl] = useState(initialUrl);
  const [error, setError] = useState("");

  async function onFile(file: File | undefined) {
    setError("");
    if (!file) return;
    if (!["image/png", "image/jpeg", "image/webp"].includes(file.type)) {
      setError(t("logoType"));
      return;
    }
    if (file.size > 2_000_000) {
      setError(t("logoSize"));
      return;
    }
    const supabase = createClient();
    if (!supabase) {
      setError(t("logoFail"));
      return;
    }
    const ext = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
    const path = `${companyId}/logo.${ext}`;
    const { error: upErr } = await supabase.storage
      .from("company-logos")
      .upload(path, file, { upsert: true, contentType: file.type });
    if (upErr) {
      setError(upErr.message);
      return;
    }
    const { data } = supabase.storage.from("company-logos").getPublicUrl(path);
    setUrl(`${data.publicUrl}?v=${Date.now()}`);
  }

  return (
    <div className="space-y-2">
      <input type="hidden" name="logo_url" value={url} />
      {url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt="" className="h-16 max-w-[10rem] object-contain object-left" />
      ) : null}
      <input
        type="file"
        accept="image/png,image/jpeg,image/webp"
        className="block text-sm"
        onChange={(e) => void onFile(e.target.files?.[0])}
      />
      <p className="text-xs text-muted-foreground">{t("logoHelp")}</p>
      {url ? (
        <Button type="button" variant="ghost" size="sm" onClick={() => setUrl("")}>
          {t("logoRemove")}
        </Button>
      ) : null}
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </div>
  );
}
