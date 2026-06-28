"use client";

import { useRef, useState } from "react";
import { ImagePlus, X } from "lucide-react";
import { trimTransparentEdges } from "@/lib/images/trim-transparent";
import { validateImageFile } from "@/lib/storage/validate";
import { MAX_LOGO_BYTES } from "@/lib/storage/constants";

type SellSheetImageUploadProps = {
  id: string;
  label: string;
  hint?: string;
  value: string | null;
  onChange: (dataUrl: string | null) => void;
  variant?: "logo" | "paint-can";
};

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error("Failed to read image"));
    reader.readAsDataURL(file);
  });
}

export function SellSheetImageUpload({
  id,
  label,
  hint,
  value,
  onChange,
  variant = "logo",
}: SellSheetImageUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);

  const previewClass =
    variant === "logo"
      ? "h-16 w-auto max-w-[180px] object-contain"
      : "h-28 w-auto max-w-[120px] object-contain";

  const handleFile = async (file: File | undefined) => {
    if (!file) return;

    const validationError = validateImageFile(file, MAX_LOGO_BYTES);
    if (validationError) {
      setError(validationError);
      return;
    }

    setError(null);
    try {
      const dataUrl = await readFileAsDataUrl(file);
      if (variant === "logo") {
        const trimmed = await trimTransparentEdges(dataUrl);
        onChange(trimmed.src);
        return;
      }
      onChange(dataUrl);
    } catch {
      setError("Could not load that image. Try another file.");
    }
  };

  return (
    <div>
      <label htmlFor={id} className="form-section-title">
        {label}
      </label>
      {hint ? <p className="mt-1 text-sm text-silver-600">{hint}</p> : null}

      <div className="mt-3 flex flex-wrap items-center gap-4">
        {value ? (
          <div className="relative rounded-lg border border-silver-300 bg-white p-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img key={value} src={value} alt="" className={previewClass} />
            <button
              type="button"
              onClick={() => {
                onChange(null);
                if (inputRef.current) inputRef.current.value = "";
              }}
              className="absolute -right-2 -top-2 flex h-7 w-7 items-center justify-center rounded-full border border-silver-300 bg-white text-navy-800 shadow-sm transition hover:bg-silver-100"
              aria-label="Remove image"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="flex h-24 w-24 flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed border-silver-400 bg-white/80 text-silver-600 transition hover:border-blue-400 hover:text-blue-600"
          >
            <ImagePlus className="h-6 w-6" />
            <span className="text-xs font-medium">Upload</span>
          </button>
        )}

        {value ? (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="text-sm font-semibold text-blue-600 hover:text-blue-700"
          >
            Replace image
          </button>
        ) : null}
      </div>

      <input
        ref={inputRef}
        id={id}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        className="sr-only"
        onChange={(event) => void handleFile(event.target.files?.[0])}
      />

      {error ? <p className="mt-2 text-sm text-red-600">{error}</p> : null}
    </div>
  );
}