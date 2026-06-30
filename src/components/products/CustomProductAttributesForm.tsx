"use client";

import { useState, type ReactNode } from "react";
import { ChevronDown, Loader2 } from "lucide-react";

import { resolveCatalogManufacturerName } from "@/app/app/(portal)/paint-library/actions";
import { ProductCanImageUpload } from "@/components/products/ProductCanImageUpload";
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
  formatCustomProductMoneyOnBlur,
  type CustomProductFormValues,
} from "@/lib/paint-library/custom-product-form";

import { ROLE_LABELS } from "@/lib/paint-library/types";
import {
  formatApplicationType,
  formatBaseType,
  formatResinSystem,
  formatSlugLabel,
  formatVocLevel,
} from "@/lib/product-catalog/product-attribute-display";
import {
  PAINT_PRODUCT_APPLICATIONS,
  type PaintProductBase,
  type PaintProductUse,
  type PaintResinSystem,
  type PaintSubstrate,
  type PaintVocLevel,
} from "@/lib/product-catalog/types";
import {
  cn,
  parseMoneyInput,
  toMoneyInputString,
} from "@/lib/utils";
import type { CompanyPaintProductRole } from "@/types/database";

const ROLE_OPTIONS: { value: CompanyPaintProductRole; label: string }[] = [
  { value: "topcoat", label: ROLE_LABELS.topcoat },
  { value: "primer", label: ROLE_LABELS.primer },
  { value: "sealer", label: ROLE_LABELS.sealer },
  { value: "undercoater", label: ROLE_LABELS.undercoater },
];

const BASE_OPTIONS: PaintProductBase[] = ["water", "oil", "solvent", "unknown"];

const RESIN_SYSTEM_OPTIONS: PaintResinSystem[] = [
  "acrylic",
  "100_percent_acrylic",
  "vinyl_acrylic",
  "alkyd",
  "alkyd_modified",
  "urethane_modified_acrylic",
  "urethane_alkyd",
  "polyurethane",
  "epoxy",
  "silicone",
  "latex",
  "oil",
  "unknown",
];

const VOC_OPTIONS: PaintVocLevel[] = ["zero", "low", "standard", "unknown"];

const PRODUCT_USE_OPTIONS: PaintProductUse[] = [
  "walls",
  "ceilings",
  "trim",
  "doors",
  "cabinets",
  "furniture",
  "masonry",
  "stucco",
  "siding",
  "decks",
  "floors",
  "metal",
  "concrete",
  "multi_surface",
];

const SUBSTRATE_OPTIONS: PaintSubstrate[] = [
  "drywall",
  "plaster",
  "wood",
  "hardboard",
  "mdf",
  "metal",
  "galvanized_metal",
  "masonry",
  "brick",
  "concrete",
  "stucco",
  "previously_painted",
  "vinyl_siding",
  "fiber_cement",
  "cabinets",
];

const CAPABILITY_FIELDS: {
  key:
    | "isSelfPriming"
    | "isStainBlocking"
    | "isMoldMildewResistant"
    | "isScrubbable"
    | "isOneCoat";
  label: string;
}[] = [
  { key: "isSelfPriming", label: "Self-priming" },
  { key: "isStainBlocking", label: "Stain blocking" },
  { key: "isMoldMildewResistant", label: "Mold & mildew resistant" },
  { key: "isScrubbable", label: "Scrubbable" },
  { key: "isOneCoat", label: "One-coat coverage" },
];

type CustomProductAttributesFormProps = {
  values: CustomProductFormValues;
  onChange: (values: CustomProductFormValues) => void;
  productId?: string | null;
  platformPaintProductId?: string | null;
  idPrefix?: string;
  afterBasicSection?: ReactNode;
  /** When true, only name, manufacturer, and afterBasicSection show until manual sections open. */
  createMode?: boolean;
  manualSectionsOpen?: boolean;
  onManualSectionsOpenChange?: (open: boolean) => void;
};

function Section({
  title,
  children,
  className,
}: {
  title: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn(
        "space-y-3 rounded-lg border border-border/80 bg-card/20 p-3",
        className,
      )}
    >
      <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {title}
      </h3>
      {children}
    </section>
  );
}

function toggleEnumValue<T extends string>(
  current: T[],
  value: T,
): T[] {
  return current.includes(value)
    ? current.filter((entry) => entry !== value)
    : [...current, value];
}

export function CustomProductAttributesForm({
  values,
  onChange,
  productId,
  platformPaintProductId,
  idPrefix = "custom-product",
  afterBasicSection,
  createMode = false,
  manualSectionsOpen = true,
  onManualSectionsOpenChange,
}: CustomProductAttributesFormProps) {
  const [manufacturerMatchHint, setManufacturerMatchHint] = useState<
    string | null
  >(null);
  const [isResolvingManufacturer, setIsResolvingManufacturer] = useState(false);

  const update = <K extends keyof CustomProductFormValues>(
    key: K,
    value: CustomProductFormValues[K],
  ) => {
    onChange({ ...values, [key]: value });
  };

  const handleManufacturerBlur = async () => {
    const typed = values.manufacturerName.trim();
    if (!typed) {
      setManufacturerMatchHint(null);
      return;
    }

    setIsResolvingManufacturer(true);
    const result = await resolveCatalogManufacturerName(typed);
    setIsResolvingManufacturer(false);

    if (!result.success) return;

    if (result.data.wasMatched) {
      onChange({ ...values, manufacturerName: result.data.canonicalName });
      setManufacturerMatchHint(`Matched ${result.data.canonicalName}`);
      return;
    }

    setManufacturerMatchHint(null);
  };

  const showManualSections = !createMode || manualSectionsOpen;

  return (
    <div className="space-y-4">
      <Section title="Basic details">
        <div className="grid gap-3 md:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor={`${idPrefix}-name`} className="text-xs text-muted-foreground">
              Product name
            </Label>
            <Input
              id={`${idPrefix}-name`}
              className="h-9"
              placeholder="e.g. Premium interior flat latex"
              value={values.name}
              onChange={(event) => update("name", event.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label
              htmlFor={`${idPrefix}-manufacturer`}
              className="text-xs text-muted-foreground"
            >
              Manufacturer <span className="text-muted-foreground/70">(optional)</span>
            </Label>
            <div className="relative">
              <Input
                id={`${idPrefix}-manufacturer`}
                className="h-9 pr-8"
                placeholder="Any brand"
                value={values.manufacturerName}
                onChange={(event) => {
                  setManufacturerMatchHint(null);
                  update("manufacturerName", event.target.value);
                }}
                onBlur={() => void handleManufacturerBlur()}
              />
              {isResolvingManufacturer ? (
                <Loader2 className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 animate-spin text-muted-foreground" />
              ) : null}
            </div>
            {manufacturerMatchHint ? (
              <p className="text-xs text-muted-foreground">{manufacturerMatchHint}</p>
            ) : null}
          </div>
        </div>

        {afterBasicSection}

        {createMode && !manualSectionsOpen ? (
          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={() => onManualSectionsOpenChange?.(true)}
          >
            <ChevronDown className="mr-2 h-4 w-4" />
            Enter product data manually
          </Button>
        ) : null}

        {showManualSections ? (
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Role</Label>
            <Select
              value={values.role}
              onValueChange={(value) =>
                update("role", value as CompanyPaintProductRole)
              }
            >
              <SelectTrigger className="h-9 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ROLE_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Scope</Label>
            <Select
              value={values.applicationType}
              onValueChange={(value) =>
                update(
                  "applicationType",
                  value as CustomProductFormValues["applicationType"],
                )
              }
            >
              <SelectTrigger className="h-9 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PAINT_PRODUCT_APPLICATIONS.map((value) => (
                  <SelectItem key={value} value={value}>
                    {formatApplicationType(value)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Base</Label>
            <Select
              value={values.baseType}
              onValueChange={(value) =>
                update("baseType", value as PaintProductBase)
              }
            >
              <SelectTrigger className="h-9 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {BASE_OPTIONS.map((value) => (
                  <SelectItem key={value} value={value}>
                    {formatBaseType(value)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label
              htmlFor={`${idPrefix}-resin-type`}
              className="text-xs text-muted-foreground"
            >
              Resin type
            </Label>
            <Input
              id={`${idPrefix}-resin-type`}
              className="h-9"
              placeholder="e.g. Acrylic latex"
              value={values.resinType}
              onChange={(event) => update("resinType", event.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Resin system</Label>
            <Select
              value={values.resinSystem}
              onValueChange={(value) =>
                update("resinSystem", value as PaintResinSystem)
              }
            >
              <SelectTrigger className="h-9 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {RESIN_SYSTEM_OPTIONS.map((value) => (
                  <SelectItem key={value} value={value}>
                    {formatResinSystem(value)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        ) : null}
      </Section>

      {showManualSections ? (
      <>
      <Section title="Pricing & productivity">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor={`${idPrefix}-cost`} className="text-xs text-muted-foreground">
              Your cost ($/gal)
            </Label>
            <Input
              id={`${idPrefix}-cost`}
              type="text"
              inputMode="decimal"
              className="h-9"
              placeholder="0.00"
              value={values.unitCost}
              onChange={(event) => update("unitCost", event.target.value)}
              onBlur={(event) => {
                const formatted = formatCustomProductMoneyOnBlur(event.target.value);
                onChange({
                  ...values,
                  unitCost: formatted,
                });
              }}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor={`${idPrefix}-coverage`} className="text-xs text-muted-foreground">
              Coverage (sf/gal)
            </Label>
            <Input
              id={`${idPrefix}-coverage`}
              type="number"
              min="1"
              className="h-9"
              value={values.coverageSqftPerGallon}
              onChange={(event) =>
                update("coverageSqftPerGallon", event.target.value)
              }
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor={`${idPrefix}-gph`} className="text-xs text-muted-foreground">
              Gallons per labor hour
            </Label>
            <Input
              id={`${idPrefix}-gph`}
              type="number"
              min="0"
              step="0.1"
              className="h-9"
              placeholder="Company default"
              value={values.gallonsPerLaborHour}
              onChange={(event) =>
                update("gallonsPerLaborHour", event.target.value)
              }
            />
          </div>
        </div>
      </Section>

      <Section title="Description & sources">
        <div className="space-y-1.5">
          <Label htmlFor={`${idPrefix}-description`} className="text-xs text-muted-foreground">
            Product description
          </Label>
          <Textarea
            id={`${idPrefix}-description`}
            rows={4}
            placeholder="Manufacturer product description"
            value={values.productDescription}
            onChange={(event) => update("productDescription", event.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor={`${idPrefix}-source-url`} className="text-xs text-muted-foreground">
            Source URL
          </Label>
          <Input
            id={`${idPrefix}-source-url`}
            className="h-9"
            placeholder="https://…"
            value={values.sourceUrl}
            onChange={(event) => update("sourceUrl", event.target.value)}
          />
        </div>
      </Section>

      <Section title="Sheens">
        <div className="space-y-1.5">
          <Label htmlFor={`${idPrefix}-sheen`} className="text-xs text-muted-foreground">
            Primary sheen <span className="text-muted-foreground/70">(optional)</span>
          </Label>
          <Input
            id={`${idPrefix}-sheen`}
            className="h-9"
            placeholder="e.g. Satin"
            value={values.sheen}
            onChange={(event) => update("sheen", event.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor={`${idPrefix}-sheen-options`} className="text-xs text-muted-foreground">
            Sheen options
          </Label>
          <Textarea
            id={`${idPrefix}-sheen-options`}
            rows={3}
            placeholder="One per line or comma-separated"
            value={values.sheenOptionsText}
            onChange={(event) => update("sheenOptionsText", event.target.value)}
          />
        </div>
      </Section>

      <Section title="Product capabilities">
        <div className="grid gap-2 sm:grid-cols-2">
          {CAPABILITY_FIELDS.map((field) => (
            <label
              key={field.key}
              className="flex items-center gap-2 rounded-md border border-border/70 px-3 py-2 text-sm"
            >
              <input
                type="checkbox"
                checked={values[field.key]}
                onChange={(event) => update(field.key, event.target.checked)}
                className="h-4 w-4 rounded border-border"
              />
              <span>{field.label}</span>
            </label>
          ))}
        </div>
      </Section>

      <Section title="Product uses">
        <div className="grid gap-2 sm:grid-cols-2">
          {PRODUCT_USE_OPTIONS.map((use) => (
            <label
              key={use}
              className="flex items-center gap-2 rounded-md border border-border/70 px-3 py-2 text-sm"
            >
              <input
                type="checkbox"
                checked={values.productUses.includes(use)}
                onChange={() =>
                  update("productUses", toggleEnumValue(values.productUses, use))
                }
                className="h-4 w-4 rounded border-border"
              />
              <span>{formatSlugLabel(use)}</span>
            </label>
          ))}
        </div>
      </Section>

      <Section title="Substrates">
        <div className="grid gap-2 sm:grid-cols-2">
          {SUBSTRATE_OPTIONS.map((substrate) => (
            <label
              key={substrate}
              className="flex items-center gap-2 rounded-md border border-border/70 px-3 py-2 text-sm"
            >
              <input
                type="checkbox"
                checked={values.substrates.includes(substrate)}
                onChange={() =>
                  update(
                    "substrates",
                    toggleEnumValue(values.substrates, substrate),
                  )
                }
                className="h-4 w-4 rounded border-border"
              />
              <span>{formatSlugLabel(substrate)}</span>
            </label>
          ))}
        </div>
      </Section>

      <Section title="Coating data">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">VOC level</Label>
            <Select
              value={values.vocLevel}
              onValueChange={(value) =>
                update("vocLevel", value as PaintVocLevel)
              }
            >
              <SelectTrigger className="h-9 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {VOC_OPTIONS.map((value) => (
                  <SelectItem key={value} value={value}>
                    {formatVocLevel(value)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label
              htmlFor={`${idPrefix}-volume-solids`}
              className="text-xs text-muted-foreground"
            >
              Volume solids (%)
            </Label>
            <Input
              id={`${idPrefix}-volume-solids`}
              type="number"
              min="0"
              max="100"
              step="0.1"
              className="h-9"
              value={values.volumeSolidsPct}
              onChange={(event) => update("volumeSolidsPct", event.target.value)}
            />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label
            htmlFor={`${idPrefix}-volume-solids-label`}
            className="text-xs text-muted-foreground"
          >
            Volume solids label
          </Label>
          <Input
            id={`${idPrefix}-volume-solids-label`}
            className="h-9"
            placeholder='e.g. 40 ± 2'
            value={values.volumeSolidsLabel}
            onChange={(event) => update("volumeSolidsLabel", event.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label
            htmlFor={`${idPrefix}-paint-features`}
            className="text-xs text-muted-foreground"
          >
            Paint system features
          </Label>
          <Textarea
            id={`${idPrefix}-paint-features`}
            rows={3}
            placeholder="One per line or comma-separated"
            value={values.paintSystemFeaturesText}
            onChange={(event) =>
              update("paintSystemFeaturesText", event.target.value)
            }
          />
        </div>
        <div className="space-y-1.5">
          <Label
            htmlFor={`${idPrefix}-feature-options`}
            className="text-xs text-muted-foreground"
          >
            Coating specifications
          </Label>
          <Textarea
            id={`${idPrefix}-feature-options`}
            rows={4}
            placeholder="One per line or comma-separated"
            value={values.paintSystemFeatureOptionsText}
            onChange={(event) =>
              update("paintSystemFeatureOptionsText", event.target.value)
            }
          />
        </div>
        <div className="space-y-1.5">
          <Label
            htmlFor={`${idPrefix}-recommended-uses`}
            className="text-xs text-muted-foreground"
          >
            Recommended uses
          </Label>
          <Textarea
            id={`${idPrefix}-recommended-uses`}
            rows={3}
            placeholder="One per line or comma-separated"
            value={values.recommendedUsesText}
            onChange={(event) =>
              update("recommendedUsesText", event.target.value)
            }
          />
        </div>
      </Section>

      <Section title="Can image">
        <ProductCanImageUpload
          idPrefix={`${idPrefix}-can`}
          productId={productId}
          platformPaintProductId={platformPaintProductId}
          canImageUrl={values.canImageUrl}
          canImageStoragePath={values.canImageStoragePath}
          onChange={(patch) => onChange({ ...values, ...patch })}
        />
      </Section>
      </>
      ) : null}
    </div>
  );
}