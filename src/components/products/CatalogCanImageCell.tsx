"use client";

import * as React from "react";
import Image from "next/image";
import { ImagePlus, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { productCanImageDisplayUrl } from "@/lib/utils";

type UploadResult =
  | {
      success: true;
      data?: { url: string; storagePath: string; updatedAt: string };
    }
  | { success: false; error: string };

type CatalogCanImageCellProps = {
  paintProductId: string;
  productName: string;
  canImageUrl: string | null;
  cacheBuster?: string | null;
  onUploaded?: (patch: {
    canImageUrl: string;
    updatedAt: string;
  }) => void;
  upload: (formData: FormData) => Promise<UploadResult>;
  size?: "sm" | "md";
};

export function CatalogCanImageCell({
  paintProductId,
  productName,
  canImageUrl,
  cacheBuster,
  onUploaded,
  upload,
  size = "sm",
}: CatalogCanImageCellProps) {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = React.useState(false);
  const [localUrl, setLocalUrl] = React.useState(canImageUrl);
  const [localCacheBuster, setLocalCacheBuster] = React.useState(cacheBuster);

  React.useEffect(() => {
    setLocalUrl(canImageUrl);
    setLocalCacheBuster(cacheBuster);
  }, [canImageUrl, cacheBuster]);

  const displayUrl = localUrl
    ? productCanImageDisplayUrl(localUrl, localCacheBuster ?? undefined) ??
      localUrl
    : null;

  const dimension = size === "sm" ? "h-12 w-12" : "h-16 w-16";

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const formData = new FormData();
      formData.set("file", file);
      formData.set("paintProductId", paintProductId);

      const result = await upload(formData);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      if (!result.data) {
        toast.error("Upload succeeded but no image data was returned.");
        return;
      }

      setLocalUrl(result.data.url);
      setLocalCacheBuster(result.data.updatedAt);
      onUploaded?.({
        canImageUrl: result.data.url,
        updatedAt: result.data.updatedAt,
      });
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

  function handlePickFile(event: React.MouseEvent) {
    event.stopPropagation();
    if (uploading) return;
    inputRef.current?.click();
  }

  return (
    <div className={dimension} onClick={(event) => event.stopPropagation()}>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        className="hidden"
        onChange={handleFileChange}
        disabled={uploading}
      />
      {displayUrl ? (
        <div
          className={`relative ${dimension} shrink-0 overflow-hidden rounded bg-white`}
        >
          <Image
            key={`${paintProductId}-${localCacheBuster ?? "can"}`}
            src={displayUrl}
            alt={`${productName} can`}
            fill
            sizes="48px"
            className="object-contain"
            unoptimized
          />
          <button
            type="button"
            onClick={handlePickFile}
            disabled={uploading}
            className="absolute inset-0 flex items-center justify-center bg-black/0 opacity-0 transition hover:bg-black/35 hover:opacity-100 disabled:pointer-events-none"
            aria-label={`Change can image for ${productName}`}
          >
            {uploading ? (
              <Loader2 className="h-4 w-4 animate-spin text-white" />
            ) : (
              <ImagePlus className="h-4 w-4 text-white" />
            )}
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={handlePickFile}
          disabled={uploading}
          className={`flex ${dimension} shrink-0 items-center justify-center rounded border border-dashed border-border bg-muted/20 text-muted-foreground transition hover:border-primary/40 hover:bg-muted/35 hover:text-foreground disabled:pointer-events-none disabled:opacity-50`}
          aria-label={`Upload can image for ${productName}`}
        >
          {uploading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <ImagePlus className="h-4 w-4" />
          )}
        </button>
      )}
    </div>
  );
}