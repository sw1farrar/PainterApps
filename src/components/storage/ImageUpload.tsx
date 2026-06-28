"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { ImageIcon, ImagePlus, Loader2, X } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { uploadCompanyLogoClient } from "@/lib/storage/upload-company-logo-client";
import { getSupabaseEnvError } from "@/lib/supabase/env";
import { isAbsoluteHttpUrl } from "@/lib/utils";

type ImageUploadProps = {
  label: string;
  description?: string;
  companyId: string;
  currentUrl?: string | null;
  onUploaded: (url: string) => void;
  onClear?: () => void;
  disabled?: boolean;
  uploadDisabled?: boolean;
  uploadDisabledMessage?: string;
};

export function ImageUpload({
  label,
  description,
  companyId,
  currentUrl,
  onUploaded,
  onClear,
  disabled = false,
  uploadDisabled = false,
  uploadDisabledMessage = "Save your company name first, then upload a logo.",
}: ImageUploadProps) {
  const router = useRouter();
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = React.useState(false);

  const previewUrl = isAbsoluteHttpUrl(currentUrl) ? currentUrl : null;
  const hasLogo = Boolean(previewUrl);

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    const envError = getSupabaseEnvError();
    if (envError) {
      toast.error(envError);
      return;
    }

    if (!companyId) {
      toast.error(uploadDisabledMessage);
      return;
    }

    setUploading(true);

    try {
      const result = await uploadCompanyLogoClient(file, companyId);
      if (!result.success) {
        toast.error(result.error);
        return;
      }

      onUploaded(result.url);
      router.refresh();
      toast.success("Logo uploaded");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to upload logo.",
      );
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  function handlePickFile() {
    if (uploadDisabled) {
      toast.error(uploadDisabledMessage);
      return;
    }
    inputRef.current?.click();
  }

  return (
    <div className="space-y-2">
      <div className="space-y-1">
        <Label>{label}</Label>
        {description ? (
          <p className="text-xs text-muted-foreground">{description}</p>
        ) : null}
      </div>

      <div className="flex flex-wrap items-center gap-4 rounded-lg border border-border bg-muted/15 p-4">
        <button
          type="button"
          onClick={handlePickFile}
          disabled={disabled || uploading}
          className="group relative flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-dashed border-border bg-muted/30 transition hover:border-primary/40 hover:bg-muted/50 disabled:pointer-events-none disabled:opacity-50"
          aria-label={hasLogo ? "Change company logo" : "Upload company logo"}
        >
          {hasLogo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={previewUrl}
              src={previewUrl!}
              alt="Company logo"
              className="h-full w-full object-contain p-2"
            />
          ) : (
            <ImageIcon className="h-8 w-8 text-muted-foreground transition group-hover:text-foreground" />
          )}
        </button>

        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            className="hidden"
            onChange={handleFileChange}
            disabled={disabled || uploading}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handlePickFile}
            disabled={disabled || uploading}
            className="w-fit"
          >
            {uploading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <ImagePlus className="h-4 w-4" />
            )}
            {uploading
              ? "Uploading…"
              : hasLogo
                ? "Change logo"
                : "Upload logo"}
          </Button>
          <p className="text-xs text-muted-foreground">
            PNG or JPG with a transparent background works best. Max 5MB.
          </p>
          {hasLogo && onClear ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onClear}
              disabled={disabled || uploading}
              className="h-auto w-fit px-0 text-xs text-muted-foreground hover:text-destructive"
            >
              <X className="mr-1 h-3.5 w-3.5" />
              Remove logo
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  );
}