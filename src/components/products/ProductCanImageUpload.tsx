"use client";

import * as React from "react";
import { ImageIcon, ImagePlus, Loader2, X } from "lucide-react";
import { toast } from "sonner";

import {
  uploadCompanyProductCanImage,
  uploadPlatformPaintProductCanImage,
} from "@/app/app/(portal)/paint-library/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { isAbsoluteHttpUrl } from "@/lib/utils";

type ProductCanImageUploadProps = {
  canImageUrl: string;
  canImageStoragePath: string;
  productId?: string | null;
  /** When set, uploads go to the master paint_products catalog immediately. */
  platformPaintProductId?: string | null;
  onChange: (patch: {
    canImageUrl: string;
    canImageStoragePath: string;
  }) => void;
  disabled?: boolean;
  idPrefix?: string;
};

export function ProductCanImageUpload({
  canImageUrl,
  canImageStoragePath,
  productId,
  platformPaintProductId,
  onChange,
  disabled = false,
  idPrefix = "product-can",
}: ProductCanImageUploadProps) {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = React.useState(false);

  const previewUrl = isAbsoluteHttpUrl(canImageUrl) ? canImageUrl : null;
  const hasImage = Boolean(previewUrl);

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const formData = new FormData();
      formData.set("file", file);

      if (platformPaintProductId) {
        formData.set("paintProductId", platformPaintProductId);
        const result = await uploadPlatformPaintProductCanImage(formData);
        if (!result.success) {
          toast.error(result.error);
          return;
        }
        onChange({
          canImageUrl: result.data.url,
          canImageStoragePath: "",
        });
      } else {
        if (productId) formData.set("productId", productId);
        const result = await uploadCompanyProductCanImage(formData);
        if (!result.success) {
          toast.error(result.error);
          return;
        }
        onChange({
          canImageUrl: result.data.url,
          canImageStoragePath: result.data.storagePath,
        });
      }
      toast.success("Can image uploaded");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to upload can image.",
      );
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  function handlePickFile() {
    inputRef.current?.click();
  }

  function handleClear() {
    onChange({ canImageUrl: "", canImageStoragePath: "" });
  }

  function handleUrlChange(url: string) {
    if (!url.trim()) {
      onChange({ canImageUrl: "", canImageStoragePath: "" });
      return;
    }
    onChange({ canImageUrl: url, canImageStoragePath: "" });
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-start gap-4 rounded-lg border border-border/70 bg-muted/15 p-4">
        <button
          type="button"
          onClick={handlePickFile}
          disabled={disabled || uploading}
          className="group relative flex h-28 w-24 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-dashed border-border bg-background/60 transition hover:border-primary/40 hover:bg-muted/30 disabled:pointer-events-none disabled:opacity-50"
          aria-label={hasImage ? "Change can image" : "Upload can image"}
        >
          {hasImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={previewUrl!}
              alt="Paint can preview"
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
              : hasImage
                ? "Change image"
                : "Upload can image"}
          </Button>
          <p className="text-xs text-muted-foreground">
            JPG, PNG, or WebP. Max 5MB. Saved to the shared product catalog and
            shown everywhere this product appears.
          </p>
          {hasImage ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleClear}
              disabled={disabled || uploading}
              className="h-auto w-fit px-0 text-xs text-muted-foreground hover:text-destructive"
            >
              <X className="mr-1 h-3.5 w-3.5" />
              Remove image
            </Button>
          ) : null}
        </div>
      </div>

      <div className="space-y-1.5">
        <Label
          htmlFor={`${idPrefix}-can-image-url`}
          className="text-xs text-muted-foreground"
        >
          Or paste image URL
        </Label>
        <Input
          id={`${idPrefix}-can-image-url`}
          className="h-9"
          placeholder="https://…"
          value={canImageUrl}
          disabled={disabled || uploading}
          onChange={(event) => handleUrlChange(event.target.value)}
        />
        {canImageStoragePath ? (
          <p className="text-[11px] text-muted-foreground">
            Uploaded file is stored in your catalog.
          </p>
        ) : null}
      </div>
    </div>
  );
}