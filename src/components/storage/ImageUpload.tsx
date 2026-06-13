"use client";

import * as React from "react";
import { ImagePlus, Loader2, X } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { uploadCompanyLogo } from "@/lib/storage/actions";
import { isAbsoluteHttpUrl } from "@/lib/utils";

type ImageUploadProps = {
  label: string;
  description?: string;
  currentUrl?: string | null;
  onUploaded: (url: string) => void;
  onClear?: () => void;
  allowUrlFallback?: boolean;
  disabled?: boolean;
  uploadDisabled?: boolean;
  uploadDisabledMessage?: string;
};

export function ImageUpload({
  label,
  description,
  currentUrl,
  onUploaded,
  onClear,
  allowUrlFallback = true,
  disabled = false,
  uploadDisabled = false,
  uploadDisabledMessage = "Save your company name first, then upload a logo.",
}: ImageUploadProps) {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = React.useState(false);
  const [urlFallback, setUrlFallback] = React.useState(
    currentUrl && !currentUrl.includes("/storage/v1/object/public/")
      ? currentUrl
      : "",
  );

  const previewUrl = isAbsoluteHttpUrl(currentUrl) ? currentUrl : null;

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploading(true);
    const formData = new FormData();
    formData.append("file", file);

    const result = await uploadCompanyLogo(formData);
    setUploading(false);

    if (inputRef.current) inputRef.current.value = "";

    if (!result.success) {
      toast.error(result.error);
      return;
    }

    onUploaded(result.data.url);
    setUrlFallback("");
    toast.success("Image uploaded.");
  }

  function handleUrlApply() {
    if (!isAbsoluteHttpUrl(urlFallback)) {
      toast.error("Enter a valid http:// or https:// image URL.");
      return;
    }

    onUploaded(urlFallback.trim());
    toast.success("Image URL saved.");
  }

  return (
    <div className="space-y-3">
      <div className="space-y-1">
        <Label>{label}</Label>
        {description ? (
          <p className="text-xs text-muted-foreground">{description}</p>
        ) : null}
      </div>

      {previewUrl ? (
        <div className="flex items-center gap-4 rounded-lg border border-border bg-muted/20 p-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={previewUrl}
            alt="Upload preview"
            className="h-16 w-16 rounded-md border border-border object-cover"
          />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm text-foreground">Current image</p>
            <p className="truncate text-xs text-muted-foreground">
              {previewUrl}
            </p>
          </div>
          {onClear ? (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={onClear}
              disabled={disabled || uploading}
              aria-label="Remove image"
            >
              <X className="h-4 w-4" />
            </Button>
          ) : null}
        </div>
      ) : null}

      <div className="flex flex-wrap items-center gap-2">
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
          onClick={() => {
            if (uploadDisabled) {
              toast.error(uploadDisabledMessage);
              return;
            }
            inputRef.current?.click();
          }}
          disabled={disabled || uploading}
        >
          {uploading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <ImagePlus className="h-4 w-4" />
          )}
          {uploading ? "Uploading…" : "Upload image"}
        </Button>
      </div>

      {allowUrlFallback ? (
        <div className="space-y-2">
          <Label htmlFor="image-url-fallback" className="text-xs text-muted-foreground">
            Or paste an image URL
          </Label>
          <div className="flex gap-2">
            <Input
              id="image-url-fallback"
              value={urlFallback}
              onChange={(e) => setUrlFallback(e.target.value)}
              placeholder="https://example.com/logo.png"
              disabled={disabled || uploading}
            />
            <Button
              type="button"
              variant="secondary"
              onClick={handleUrlApply}
              disabled={disabled || uploading || !urlFallback.trim()}
            >
              Use URL
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}