"use client";

import * as React from "react";
import { ImagePlus, Loader2, X } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  removeJobPhoto,
  removeQuotePhoto,
  uploadJobPhoto,
  uploadQuotePhoto,
} from "@/lib/storage/actions";
import { isAbsoluteHttpUrl } from "@/lib/utils";

type PhotoGalleryUploadProps = {
  photos: string[];
  onChange: (photos: string[]) => void;
  quoteId?: string;
  jobId?: string;
  variant?: "quote" | "job";
  label?: string;
  description?: string;
  disabled?: boolean;
};

export function PhotoGalleryUpload({
  photos,
  onChange,
  quoteId,
  jobId,
  variant = "quote",
  label = "Before photos",
  description = "Upload job site photos to include with this quote.",
  disabled = false,
}: PhotoGalleryUploadProps) {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = React.useState(false);
  const [removingUrl, setRemovingUrl] = React.useState<string | null>(null);

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    if (!files.length) return;

    setUploading(true);
    const uploaded: string[] = [];

    for (const file of files) {
      const formData = new FormData();
      formData.append("file", file);

      const result =
        variant === "job"
          ? await (() => {
              if (jobId) formData.append("jobId", jobId);
              return uploadJobPhoto(formData);
            })()
          : await (() => {
              if (quoteId) formData.append("quoteId", quoteId);
              return uploadQuotePhoto(formData);
            })();
      if (!result.success) {
        toast.error(result.error);
        continue;
      }

      uploaded.push(result.data.url);
    }

    setUploading(false);
    if (inputRef.current) inputRef.current.value = "";

    if (uploaded.length) {
      onChange([...photos, ...uploaded]);
      toast.success(
        uploaded.length === 1
          ? "Photo uploaded."
          : `${uploaded.length} photos uploaded.`,
      );
    }
  }

  async function handleRemove(photoUrl: string) {
    setRemovingUrl(photoUrl);

    const isManagedPhoto =
      variant === "job"
        ? photoUrl.includes("/storage/v1/object/public/job-photos/")
        : photoUrl.includes("/storage/v1/object/public/quote-photos/");

    if (isManagedPhoto) {
      const result =
        variant === "job"
          ? await removeJobPhoto(photoUrl)
          : await removeQuotePhoto(photoUrl);
      if (!result.success) {
        setRemovingUrl(null);
        toast.error(result.error);
        return;
      }
    }

    onChange(photos.filter((photo) => photo !== photoUrl));
    setRemovingUrl(null);
    toast.success("Photo removed.");
  }

  return (
    <div className="space-y-3">
      <div className="space-y-1">
        <Label>{label}</Label>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>

      {photos.length ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {photos.map((photo) => (
            <div
              key={photo}
              className="group relative overflow-hidden rounded-lg border border-border bg-muted/20"
            >
              {isAbsoluteHttpUrl(photo) ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={photo}
                  alt="Quote photo"
                  className="aspect-square w-full object-cover"
                />
              ) : (
                <div className="flex aspect-square items-center justify-center p-3 text-xs text-muted-foreground">
                  Invalid image URL
                </div>
              )}
              <Button
                type="button"
                variant="secondary"
                size="icon"
                className="absolute top-2 right-2 h-7 w-7 opacity-90"
                onClick={() => handleRemove(photo)}
                disabled={disabled || removingUrl === photo}
                aria-label="Remove photo"
              >
                {removingUrl === photo ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <X className="h-3.5 w-3.5" />
                )}
              </Button>
            </div>
          ))}
        </div>
      ) : null}

      <div>
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          multiple
          className="hidden"
          onChange={handleFileChange}
          disabled={disabled || uploading}
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => inputRef.current?.click()}
          disabled={disabled || uploading}
        >
          {uploading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <ImagePlus className="h-4 w-4" />
          )}
          {uploading ? "Uploading…" : "Add photos"}
        </Button>
      </div>
    </div>
  );
}