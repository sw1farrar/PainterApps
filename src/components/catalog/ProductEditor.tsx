"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  createCatalogProduct,
  deleteCatalogProduct,
  saveCatalogProduct,
} from "@/app/app/catalog/actions";
import { PRODUCT_FIELD_GROUPS } from "@/lib/systems/product-fields";
import { SHEENS, SUBSTRATES } from "@/lib/systems/types";

const SUBSTRATE_LABEL: Record<string, string> = {
  drywall: "Drywall",
  wood: "Wood",
  masonry: "Masonry / brick",
  stucco: "Stucco",
  metal: "Metal",
  "previously-painted": "Previously painted",
  "concrete-floor": "Concrete floor",
};

function str(row: Record<string, unknown>, key: string) {
  const v = row[key];
  if (v == null) return "";
  if (Array.isArray(v)) return v.join(", ");
  return String(v);
}

function asList(value: unknown): string[] {
  return Array.isArray(value) ? value.map(String) : [];
}

export function ProductEditor({
  product,
  manufacturers,
  creating = false,
  onDone,
}: {
  product: Record<string, unknown>;
  manufacturers: Array<{ id: string; name: string }>;
  creating?: boolean;
  onDone?: () => void;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  async function onSubmit(formData: FormData) {
    setError(null);
    setSaved(false);
    const result = creating
      ? await createCatalogProduct(formData)
      : await saveCatalogProduct(formData);
    if (result.error) {
      setError(result.error);
      return;
    }
    setSaved(true);
    router.refresh();
    onDone?.();
  }

  async function onDelete() {
    if (!confirm("Delete this product?")) return;
    const form = new FormData();
    form.set("id", String(product.id ?? ""));
    const result = await deleteCatalogProduct(form);
    if (result.error) {
      setError(result.error);
      return;
    }
    router.refresh();
    onDone?.();
  }

  const attrsJson =
    product.attrs && typeof product.attrs === "object"
      ? JSON.stringify(product.attrs, null, 2)
      : "";

  return (
    <form action={onSubmit} className="space-y-10">
      {creating ? null : (
        <input type="hidden" name="id" value={String(product.id)} />
      )}

      <section className="grid gap-4 sm:grid-cols-2">
        {creating ? (
          <label className="grid gap-1 text-sm sm:col-span-2">
            <span className="text-muted-foreground">Id (optional)</span>
            <Input name="id" placeholder="sw-duration-ext" />
          </label>
        ) : (
          <p className="text-xs text-muted-foreground sm:col-span-2">
            {String(product.id)}
          </p>
        )}
        <label className="grid gap-1 text-sm sm:col-span-2">
          <span className="text-muted-foreground">Name</span>
          <Input name="name" defaultValue={str(product, "name")} required />
        </label>
        <label className="grid gap-1 text-sm">
          <span className="text-muted-foreground">Manufacturer</span>
          <select
            name="manufacturer_id"
            defaultValue={str(product, "manufacturer_id")}
            className="h-9 rounded-md border border-input bg-background px-3 text-sm"
          >
            {manufacturers.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-1 text-sm">
          <span className="text-muted-foreground">SKU</span>
          <Input name="sku" defaultValue={str(product, "sku")} />
        </label>
        <label className="grid gap-1 text-sm">
          <span className="text-muted-foreground">Kind</span>
          <select
            name="kind"
            defaultValue={str(product, "kind") || "topcoat"}
            className="h-9 rounded-md border border-input bg-background px-3 text-sm"
          >
            <option value="prep">prep</option>
            <option value="primer">primer</option>
            <option value="topcoat">topcoat</option>
            <option value="other">other</option>
          </select>
        </label>
        <label className="grid gap-1 text-sm">
          <span className="text-muted-foreground">VOC g/L</span>
          <Input
            name="voc_g_l"
            defaultValue={str(product, "voc_g_l")}
            inputMode="decimal"
          />
        </label>
        <label className="grid gap-1 text-sm sm:col-span-2">
          <span className="text-muted-foreground">Notes</span>
          <textarea
            name="notes"
            defaultValue={str(product, "notes")}
            rows={3}
            className="rounded-md border border-input bg-background px-3 py-2 text-sm"
          />
        </label>
        <label className="grid gap-1 text-sm sm:col-span-2">
          <span className="text-muted-foreground">TDS URL</span>
          <Input name="tds_url" defaultValue={str(product, "tds_url")} />
        </label>
        <label className="grid gap-1 text-sm">
          <span className="text-muted-foreground">TDS revision</span>
          <Input name="tds_revision" defaultValue={str(product, "tds_revision")} />
        </label>
        <label className="grid gap-1 text-sm">
          <span className="text-muted-foreground">TDS date</span>
          <Input name="tds_date" defaultValue={str(product, "tds_date")} />
        </label>
        <fieldset className="sm:col-span-2">
          <legend className="mb-2 text-sm text-muted-foreground">Place</legend>
          <div className="flex flex-wrap gap-4">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                name="interior"
                defaultChecked={Boolean(product.interior)}
              />
              Interior
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                name="exterior"
                defaultChecked={Boolean(product.exterior)}
              />
              Exterior
            </label>
          </div>
        </fieldset>
        <fieldset className="sm:col-span-2">
          <legend className="mb-2 text-sm text-muted-foreground">
            Substrates
          </legend>
          <div className="flex flex-wrap gap-x-4 gap-y-2">
            {SUBSTRATES.map((id) => (
              <label key={id} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  name="substrates"
                  value={id}
                  defaultChecked={asList(product.substrates).includes(id)}
                />
                {SUBSTRATE_LABEL[id] ?? id}
              </label>
            ))}
          </div>
        </fieldset>
        <fieldset className="sm:col-span-2">
          <legend className="mb-2 text-sm text-muted-foreground">Sheens</legend>
          <div className="flex flex-wrap gap-x-4 gap-y-2">
            {SHEENS.map((id) => (
              <label key={id} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  name="sheens"
                  value={id}
                  defaultChecked={asList(product.sheens).includes(id)}
                />
                {id}
              </label>
            ))}
          </div>
        </fieldset>
      </section>

      {PRODUCT_FIELD_GROUPS.map((group) => (
        <section key={group.id}>
          <h2 className="text-lg font-medium tracking-tight">{group.label}</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            {group.fields.map((field) => (
              <label
                key={field.key}
                className={`grid gap-1 text-sm ${
                  field.kind === "text" &&
                  (field.key.includes("url") ||
                    field.key.includes("conditions") ||
                    field.key === "certifications" ||
                    field.key === "astm_refs")
                    ? "sm:col-span-2"
                    : ""
                }`}
              >
                <span className="text-muted-foreground">{field.label}</span>
                {field.kind === "text[]" ||
                field.key === "rain_ready_conditions" ? (
                  <textarea
                    name={field.key}
                    defaultValue={str(product, field.key)}
                    rows={2}
                    className="rounded-md border border-input bg-background px-3 py-2 text-sm"
                  />
                ) : (
                  <Input
                    name={field.key}
                    defaultValue={str(product, field.key)}
                    inputMode={
                      field.kind === "number" || field.kind === "integer"
                        ? "decimal"
                        : "text"
                    }
                  />
                )}
              </label>
            ))}
          </div>
        </section>
      ))}

      <section>
        <h2 className="text-lg font-medium tracking-tight">Overflow attrs</h2>
        <textarea
          name="attrs_json"
          defaultValue={attrsJson}
          rows={6}
          className="mt-3 w-full rounded-md border border-input bg-background px-3 py-2 font-mono text-xs"
        />
      </section>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      {saved ? (
        <p className="text-sm text-muted-foreground">Saved.</p>
      ) : null}
      <div className="flex flex-wrap gap-2">
        <Button type="submit" className="paint-gradient border-0 text-white">
          {creating ? "Create" : "Save"}
        </Button>
        {creating ? null : (
          <Button type="button" variant="outline" onClick={() => void onDelete()}>
            Delete
          </Button>
        )}
      </div>
    </form>
  );
}
