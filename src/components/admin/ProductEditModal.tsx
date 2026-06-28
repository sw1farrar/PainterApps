"use client";

import * as React from "react";
import Image from "next/image";
import { Loader2, X } from "lucide-react";

import type { UpdatePaintProductInput } from "@/app/app/admin/product-catalog/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  formatListInput,
  parseListInput,
} from "@/lib/product-catalog/parse-list-input";
import { formatApplicationType } from "@/lib/product-catalog/product-attribute-display";
import {
  PAINT_PRODUCT_APPLICATIONS,
  type CatalogProductRow,
  type PaintManufacturerRow,
  type PaintProductApplication,
  type PaintProductBase,
  type PaintProductCategory,
} from "@/lib/product-catalog/types";
import { cn, productCanImageDisplayUrl } from "@/lib/utils";

type ProductEditModalProps = {
  product: CatalogProductRow | null;
  manufacturers: PaintManufacturerRow[];
  open: boolean;
  loading?: boolean;
  onClose: () => void;
  onSave: (input: UpdatePaintProductInput) => void;
};

const fieldLabelClass =
  "text-sm font-semibold text-navy-800";
const fieldInputClass =
  "border-silver-300 bg-white text-navy-900 placeholder:text-silver-500 shadow-sm";
const fieldSelectTriggerClass =
  "border-silver-300 bg-white text-navy-900 shadow-sm";
const fieldSelectContentClass =
  "border-silver-300 bg-white text-navy-900";
const fieldSelectItemClass =
  "text-navy-900 focus:bg-silver-100 focus:text-navy-900";
const sectionClass =
  "rounded-lg border border-silver-200 bg-white px-4 py-4 shadow-sm";

function buildFormState(product: CatalogProductRow): UpdatePaintProductInput {
  return {
    id: product.id,
    manufacturer_id: product.manufacturer_id,
    name: product.name,
    application_type: product.application_type,
    category: product.category,
    resin_type: product.resin_type,
    base_type: product.base_type,
    source_url: product.source_url,
    enrichment_source_url: product.enrichment_source_url,
    product_description: product.product_description,
    sheen_options: product.sheen_options,
    paint_system_features: product.paint_system_features,
    paint_system_feature_options: product.paint_system_feature_options,
    can_image_url: product.can_image_url,
    is_discontinued: product.is_discontinued,
  };
}

function buildSavePayload(
  form: UpdatePaintProductInput,
  sheenText: string,
  featuresText: string,
  featureOptionsText: string,
): UpdatePaintProductInput {
  return {
    ...form,
    name: form.name.trim(),
    resin_type: form.resin_type?.trim() || null,
    source_url: form.source_url?.trim() || null,
    enrichment_source_url: form.enrichment_source_url?.trim() || null,
    product_description: form.product_description?.trim() || null,
    can_image_url: form.can_image_url?.trim() || null,
    sheen_options: parseListInput(sheenText),
    paint_system_features: parseListInput(featuresText),
    paint_system_feature_options: parseListInput(featureOptionsText),
  };
}

function serializePayload(payload: UpdatePaintProductInput): string {
  return JSON.stringify(payload);
}

export function ProductEditModal({
  product,
  manufacturers,
  open,
  loading = false,
  onClose,
  onSave,
}: ProductEditModalProps) {
  const [form, setForm] = React.useState<UpdatePaintProductInput | null>(null);
  const [sheenText, setSheenText] = React.useState("");
  const [featuresText, setFeaturesText] = React.useState("");
  const [featureOptionsText, setFeatureOptionsText] = React.useState("");
  const [unsavedPromptOpen, setUnsavedPromptOpen] = React.useState(false);
  const initialSnapshotRef = React.useRef<string | null>(null);

  React.useEffect(() => {
    if (!product) {
      setForm(null);
      initialSnapshotRef.current = null;
      return;
    }

    const next = buildFormState(product);
    const sheens = formatListInput(next.sheen_options);
    const features = formatListInput(next.paint_system_features);
    const featureOptions = formatListInput(next.paint_system_feature_options);

    setForm(next);
    setSheenText(sheens);
    setFeaturesText(features);
    setFeatureOptionsText(featureOptions);
    setUnsavedPromptOpen(false);
    initialSnapshotRef.current = serializePayload(
      buildSavePayload(next, sheens, features, featureOptions),
    );
  }, [product?.id, product?.updated_at]);

  const isDirty = React.useMemo(() => {
    if (!form || !initialSnapshotRef.current) return false;
    const current = serializePayload(
      buildSavePayload(form, sheenText, featuresText, featureOptionsText),
    );
    return current !== initialSnapshotRef.current;
  }, [form, sheenText, featuresText, featureOptionsText]);

  const requestClose = React.useCallback(() => {
    if (loading) return;
    if (isDirty) {
      setUnsavedPromptOpen(true);
      return;
    }
    onClose();
  }, [isDirty, loading, onClose]);

  React.useEffect(() => {
    if (!open) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      if (unsavedPromptOpen) {
        setUnsavedPromptOpen(false);
        return;
      }
      requestClose();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, requestClose, unsavedPromptOpen]);

  if (!open || !product || !form) return null;

  function updateField<K extends keyof UpdatePaintProductInput>(
    key: K,
    value: UpdatePaintProductInput[K],
  ) {
    setForm((current) => (current ? { ...current, [key]: value } : current));
  }

  function submitPayload() {
    if (!form) return;
    onSave(
      buildSavePayload(form, sheenText, featuresText, featureOptionsText),
    );
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    submitPayload();
  }

  function handleDiscardChanges() {
    setUnsavedPromptOpen(false);
    onClose();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-navy-950/70 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="product-edit-title"
      onClick={requestClose}
    >
      <form
        onSubmit={handleSubmit}
        onClick={(event) => event.stopPropagation()}
        className="surface-form relative max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-xl p-6 shadow-2xl sm:p-8"
      >
        <button
          type="button"
          onClick={requestClose}
          className="absolute right-4 top-4 rounded p-1 text-silver-600 transition hover:bg-silver-100 hover:text-navy-900"
          aria-label="Close"
          disabled={loading}
        >
          <X className="h-5 w-5" />
        </button>

        <h2 id="product-edit-title" className="font-display text-2xl text-navy-900">
          Edit product
        </h2>
        <p className="mt-2 text-sm font-medium text-navy-700">
          {product.manufacturer_name} — {product.name}
        </p>
        {isDirty ? (
          <p className="mt-1 text-xs font-medium text-amber-800">
            Unsaved changes
          </p>
        ) : null}

        <div className="mt-6 space-y-4">
          <div className={cn(sectionClass, "grid gap-4 sm:grid-cols-2")}>
            <p className="text-xs font-semibold uppercase tracking-wide text-silver-600 sm:col-span-2">
              Basic details
            </p>

            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="product-name" className={fieldLabelClass}>
                Product name
              </Label>
              <Input
                id="product-name"
                value={form.name}
                onChange={(event) => updateField("name", event.target.value)}
                className={fieldInputClass}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="product-manufacturer" className={fieldLabelClass}>
                Manufacturer
              </Label>
              <Select
                value={form.manufacturer_id}
                onValueChange={(value) => updateField("manufacturer_id", value)}
              >
                <SelectTrigger
                  id="product-manufacturer"
                  className={fieldSelectTriggerClass}
                >
                  <SelectValue placeholder="Select manufacturer" />
                </SelectTrigger>
                <SelectContent className={fieldSelectContentClass}>
                  {manufacturers.map((manufacturer) => (
                    <SelectItem
                      key={manufacturer.id}
                      value={manufacturer.id}
                      className={fieldSelectItemClass}
                    >
                      {manufacturer.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="product-application" className={fieldLabelClass}>
                Interior / exterior
              </Label>
              <Select
                value={form.application_type}
                onValueChange={(value) =>
                  updateField("application_type", value as PaintProductApplication)
                }
              >
                <SelectTrigger
                  id="product-application"
                  className={fieldSelectTriggerClass}
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className={fieldSelectContentClass}>
                  {PAINT_PRODUCT_APPLICATIONS.map((value) => (
                    <SelectItem
                      key={value}
                      value={value}
                      className={fieldSelectItemClass}
                    >
                      {formatApplicationType(value)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="product-category" className={fieldLabelClass}>
                Type
              </Label>
              <Select
                value={form.category}
                onValueChange={(value) =>
                  updateField("category", value as PaintProductCategory)
                }
              >
                <SelectTrigger
                  id="product-category"
                  className={fieldSelectTriggerClass}
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className={fieldSelectContentClass}>
                  <SelectItem value="paint" className={fieldSelectItemClass}>
                    Paint
                  </SelectItem>
                  <SelectItem value="primer" className={fieldSelectItemClass}>
                    Primer
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="product-base" className={fieldLabelClass}>
                Base
              </Label>
              <Select
                value={form.base_type}
                onValueChange={(value) =>
                  updateField("base_type", value as PaintProductBase)
                }
              >
                <SelectTrigger id="product-base" className={fieldSelectTriggerClass}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className={fieldSelectContentClass}>
                  <SelectItem value="water" className={fieldSelectItemClass}>
                    Water-based
                  </SelectItem>
                  <SelectItem value="oil" className={fieldSelectItemClass}>
                    Oil-based
                  </SelectItem>
                  <SelectItem value="unknown" className={fieldSelectItemClass}>
                    Unknown
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="product-resin" className={fieldLabelClass}>
                Resin type
              </Label>
              <Input
                id="product-resin"
                value={form.resin_type ?? ""}
                onChange={(event) =>
                  updateField("resin_type", event.target.value || null)
                }
                className={fieldInputClass}
              />
            </div>
          </div>

          <div className={cn(sectionClass, "space-y-4")}>
            <p className="text-xs font-semibold uppercase tracking-wide text-silver-600">
              Sources & description
            </p>

            <div className="space-y-2">
              <Label htmlFor="product-source-url" className={fieldLabelClass}>
                Source URL
              </Label>
              <Input
                id="product-source-url"
                value={form.source_url ?? ""}
                onChange={(event) =>
                  updateField("source_url", event.target.value || null)
                }
                className={fieldInputClass}
              />
            </div>

            <div className="space-y-2">
              <Label
                htmlFor="product-enrichment-source-url"
                className={fieldLabelClass}
              >
                Enrichment source URL
              </Label>
              <Input
                id="product-enrichment-source-url"
                value={form.enrichment_source_url ?? ""}
                onChange={(event) =>
                  updateField(
                    "enrichment_source_url",
                    event.target.value || null,
                  )
                }
                className={fieldInputClass}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="product-description" className={fieldLabelClass}>
                Description
              </Label>
              <Textarea
                id="product-description"
                value={form.product_description ?? ""}
                onChange={(event) =>
                  updateField("product_description", event.target.value || null)
                }
                rows={4}
                className={fieldInputClass}
              />
            </div>
          </div>

          <div className={cn(sectionClass, "grid gap-4 sm:grid-cols-2")}>
            <p className="text-xs font-semibold uppercase tracking-wide text-silver-600 sm:col-span-2">
              Coating data
            </p>

            <div className="space-y-2">
              <Label htmlFor="product-sheens" className={fieldLabelClass}>
                Sheen options
              </Label>
              <Textarea
                id="product-sheens"
                value={sheenText}
                onChange={(event) => setSheenText(event.target.value)}
                rows={4}
                placeholder="One per line or comma-separated"
                className={fieldInputClass}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="product-features" className={fieldLabelClass}>
                Paint system features
              </Label>
              <Textarea
                id="product-features"
                value={featuresText}
                onChange={(event) => setFeaturesText(event.target.value)}
                rows={4}
                placeholder="One per line or comma-separated"
                className={fieldInputClass}
              />
            </div>

            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="product-feature-options" className={fieldLabelClass}>
                Paint system feature options
              </Label>
              <Textarea
                id="product-feature-options"
                value={featureOptionsText}
                onChange={(event) => setFeatureOptionsText(event.target.value)}
                rows={5}
                placeholder="One per line or comma-separated"
                className={fieldInputClass}
              />
            </div>
          </div>

          <div className={cn(sectionClass, "space-y-4")}>
            <p className="text-xs font-semibold uppercase tracking-wide text-silver-600">
              Can image
            </p>

            <div className="space-y-2">
              <Label htmlFor="product-can-image-url" className={fieldLabelClass}>
                Can image URL
              </Label>
              <Input
                id="product-can-image-url"
                value={form.can_image_url ?? ""}
                onChange={(event) =>
                  updateField("can_image_url", event.target.value || null)
                }
                className={fieldInputClass}
              />
            </div>

            {form.can_image_url ? (
              <div className="rounded-lg border border-silver-200 bg-silver-50 p-3">
                <Image
                  key={`${product?.id ?? "new"}-${product?.updated_at ?? "preview"}`}
                  src={
                    productCanImageDisplayUrl(
                      form.can_image_url,
                      product?.updated_at,
                    ) ?? form.can_image_url
                  }
                  alt={`${form.name} can preview`}
                  width={160}
                  height={160}
                  className="mx-auto h-32 w-auto object-contain"
                  unoptimized
                />
              </div>
            ) : null}
          </div>

          <div className={sectionClass}>
            <div className="flex items-center gap-3">
              <input
                id="product-discontinued"
                type="checkbox"
                checked={form.is_discontinued}
                onChange={(event) =>
                  updateField("is_discontinued", event.target.checked)
                }
                className="h-4 w-4 rounded border-silver-400 text-primary focus:ring-primary"
              />
              <Label
                htmlFor="product-discontinued"
                className={cn(fieldLabelClass, "cursor-pointer")}
              >
                Discontinued product
              </Label>
            </div>
          </div>
        </div>

        <div className="mt-8 flex flex-wrap justify-end gap-3 border-t border-silver-200 pt-6">
          <Button
            type="button"
            variant="outline"
            onClick={requestClose}
            disabled={loading}
            className="border-silver-300 bg-white text-navy-800 hover:bg-silver-100"
          >
            Cancel
          </Button>
          <Button type="submit" disabled={loading || !form.name.trim()}>
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving…
              </>
            ) : (
              "Save changes"
            )}
          </Button>
        </div>

        {unsavedPromptOpen ? (
          <div
            className="absolute inset-0 z-10 flex items-center justify-center rounded-xl bg-navy-950/45 p-4"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="w-full max-w-md rounded-xl border border-silver-200 bg-white p-5 shadow-xl">
              <h3 className="font-display text-lg text-navy-900">
                Save changes?
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-navy-700">
                You have unsaved edits to this product. Save them before
                closing, or discard your changes.
              </p>
              <div className="mt-5 flex flex-wrap justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setUnsavedPromptOpen(false)}
                  disabled={loading}
                  className="border-silver-300 bg-white text-navy-800 hover:bg-silver-100"
                >
                  Keep editing
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleDiscardChanges}
                  disabled={loading}
                  className="border-silver-300 bg-white text-navy-800 hover:bg-silver-100"
                >
                  Discard
                </Button>
                <Button
                  type="button"
                  onClick={submitPayload}
                  disabled={loading || !form.name.trim()}
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving…
                    </>
                  ) : (
                    "Save changes"
                  )}
                </Button>
              </div>
            </div>
          </div>
        ) : null}
      </form>
    </div>
  );
}