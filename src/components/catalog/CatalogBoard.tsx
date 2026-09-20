"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ProductEditor } from "@/components/catalog/ProductEditor";
import { patchCatalogFlags } from "@/app/app/catalog/actions";
import {
  PRODUCT_KINDS,
  SHEENS,
  SUBSTRATES,
} from "@/lib/systems/types";

const SUBSTRATE_LABEL: Record<string, string> = {
  drywall: "Drywall",
  wood: "Wood",
  masonry: "Masonry",
  stucco: "Stucco",
  metal: "Metal",
  "previously-painted": "Prev. painted",
  "concrete-floor": "Concrete floor",
};

function asList(value: unknown): string[] {
  return Array.isArray(value) ? value.map(String) : [];
}

function emptyProduct(manufacturerId: string): Record<string, unknown> {
  return {
    id: "",
    manufacturer_id: manufacturerId,
    name: "",
    sku: "",
    kind: "topcoat",
    interior: false,
    exterior: true,
    substrates: [],
    sheens: [],
    voc_g_l: "",
    notes: "",
    tds_url: "",
    tds_revision: "",
    tds_date: "",
    attrs: {},
  };
}

export function CatalogBoard({
  products,
  manufacturers,
}: {
  products: Record<string, unknown>[];
  manufacturers: Array<{ id: string; name: string }>;
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [q, setQ] = useState("");
  const [kinds, setKinds] = useState<string[]>([]);
  const [mfrs, setMfrs] = useState<string[]>([]);
  const [place, setPlace] = useState<string[]>([]);
  const [subs, setSubs] = useState<string[]>([]);
  const [sheens, setSheens] = useState<string[]>([]);
  const [open, setOpen] = useState<Record<string, unknown> | "new" | null>(
    null,
  );

  const mfrName = useMemo(
    () => new Map(manufacturers.map((m) => [m.id, m.name])),
    [manufacturers],
  );

  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return products.filter((p) => {
      if (kinds.length && !kinds.includes(String(p.kind ?? ""))) return false;
      if (mfrs.length && !mfrs.includes(String(p.manufacturer_id ?? ""))) {
        return false;
      }
      if (place.includes("interior") && !p.interior) return false;
      if (place.includes("exterior") && !p.exterior) return false;
      const substrates = asList(p.substrates);
      if (subs.length && !subs.some((s) => substrates.includes(s))) return false;
      const productSheens = asList(p.sheens);
      if (sheens.length && !sheens.some((s) => productSheens.includes(s))) {
        return false;
      }
      if (!needle) return true;
      const hay = [
        p.id,
        p.name,
        p.sku,
        p.notes,
        p.kind,
        mfrName.get(String(p.manufacturer_id ?? "")),
      ]
        .join(" ")
        .toLowerCase();
      return hay.includes(needle);
    });
  }, [products, q, kinds, mfrs, place, subs, sheens, mfrName]);

  function toggle(list: string[], set: (n: string[]) => void, id: string) {
    set(list.includes(id) ? list.filter((x) => x !== id) : [...list, id]);
  }

  async function flipFlag(
    id: string,
    field: "interior" | "exterior",
    value: boolean,
  ) {
    const form = new FormData();
    form.set("id", id);
    form.set("field", field);
    form.set("value", value ? "true" : "false");
    await patchCatalogFlags(form);
    startTransition(() => router.refresh());
  }

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(null);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const editing =
    open === "new"
      ? emptyProduct(manufacturers[0]?.id ?? "")
      : open;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-[16rem] flex-1">
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search name, SKU, brand…"
            aria-label="Search products"
          />
        </div>
        <Button
          type="button"
          className="paint-gradient border-0 text-white"
          onClick={() => setOpen("new")}
        >
          Add product
        </Button>
      </div>

      <div className="space-y-3 rounded-xl border border-border p-4">
        <FilterChecks
          label="Kind"
          options={PRODUCT_KINDS.map((id) => ({ id, label: id }))}
          selected={kinds}
          onToggle={(id) => toggle(kinds, setKinds, id)}
        />
        <FilterChecks
          label="Brand"
          options={manufacturers.map((m) => ({ id: m.id, label: m.name }))}
          selected={mfrs}
          onToggle={(id) => toggle(mfrs, setMfrs, id)}
        />
        <FilterChecks
          label="Place"
          options={[
            { id: "interior", label: "Interior" },
            { id: "exterior", label: "Exterior" },
          ]}
          selected={place}
          onToggle={(id) => toggle(place, setPlace, id)}
        />
        <FilterChecks
          label="Substrate"
          options={SUBSTRATES.map((id) => ({
            id,
            label: SUBSTRATE_LABEL[id] ?? id,
          }))}
          selected={subs}
          onToggle={(id) => toggle(subs, setSubs, id)}
        />
        <FilterChecks
          label="Sheen"
          options={SHEENS.map((id) => ({ id, label: id }))}
          selected={sheens}
          onToggle={(id) => toggle(sheens, setSheens, id)}
        />
      </div>

      <p className="text-sm text-muted-foreground">
        {rows.length} product{rows.length === 1 ? "" : "s"}
      </p>

      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="w-full min-w-[52rem] text-left text-sm">
          <thead className="border-b border-border bg-muted/40 text-xs uppercase tracking-[0.12em] text-muted-foreground">
            <tr>
              <th className="px-3 py-2 font-medium">Brand</th>
              <th className="px-3 py-2 font-medium">Product</th>
              <th className="px-3 py-2 font-medium">Kind</th>
              <th className="px-3 py-2 font-medium">Interior</th>
              <th className="px-3 py-2 font-medium">Exterior</th>
              <th className="px-3 py-2 font-medium">Substrates</th>
              <th className="px-3 py-2 font-medium">Sheens</th>
              <th className="px-3 py-2 font-medium">VOC</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((p) => (
              <tr
                key={String(p.id)}
                className="cursor-pointer border-b border-border last:border-0 hover:bg-muted/40"
                onClick={() => setOpen(p)}
              >
                <td className="px-3 py-2 text-muted-foreground">
                  {mfrName.get(String(p.manufacturer_id ?? "")) ??
                    String(p.manufacturer_id ?? "")}
                </td>
                <td className="px-3 py-2">
                  <span className="font-medium">{String(p.name ?? "")}</span>
                  {p.sku ? (
                    <span className="ml-2 text-xs text-muted-foreground">
                      {String(p.sku)}
                    </span>
                  ) : null}
                </td>
                <td className="px-3 py-2">{String(p.kind ?? "")}</td>
                <td className="px-3 py-2" onClick={(e) => e.stopPropagation()}>
                  <input
                    type="checkbox"
                    checked={Boolean(p.interior)}
                    onChange={(e) =>
                      void flipFlag(String(p.id), "interior", e.target.checked)
                    }
                    aria-label="Interior"
                  />
                </td>
                <td className="px-3 py-2" onClick={(e) => e.stopPropagation()}>
                  <input
                    type="checkbox"
                    checked={Boolean(p.exterior)}
                    onChange={(e) =>
                      void flipFlag(String(p.id), "exterior", e.target.checked)
                    }
                    aria-label="Exterior"
                  />
                </td>
                <td className="max-w-[12rem] truncate px-3 py-2 text-xs text-muted-foreground">
                  {asList(p.substrates).join(", ")}
                </td>
                <td className="max-w-[10rem] truncate px-3 py-2 text-xs text-muted-foreground">
                  {asList(p.sheens).join(", ")}
                </td>
                <td className="px-3 py-2 tabular-nums text-muted-foreground">
                  {p.voc_g_l == null || p.voc_g_l === "" ? "—" : String(p.voc_g_l)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {editing ? (
        <CatalogEnvelope
          product={editing}
          manufacturers={manufacturers}
          creating={open === "new"}
          onClose={() => setOpen(null)}
        />
      ) : null}
    </div>
  );
}

function FilterChecks({
  label,
  options,
  selected,
  onToggle,
}: {
  label: string;
  options: Array<{ id: string; label: string }>;
  selected: string[];
  onToggle: (id: string) => void;
}) {
  return (
    <div className="grid gap-2 sm:grid-cols-[7rem_1fr] sm:items-start">
      <p className="pt-1 text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
        {label}
      </p>
      <div className="flex flex-wrap gap-x-4 gap-y-1">
        {options.map((opt) => (
          <label key={opt.id} className="flex items-center gap-1.5 text-sm">
            <input
              type="checkbox"
              checked={selected.includes(opt.id)}
              onChange={() => onToggle(opt.id)}
            />
            {opt.label}
          </label>
        ))}
      </div>
    </div>
  );
}

function CatalogEnvelope({
  product,
  manufacturers,
  creating,
  onClose,
}: {
  product: Record<string, unknown>;
  manufacturers: Array<{ id: string; name: string }>;
  creating: boolean;
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-3 sm:p-8"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div
        className="envelope-panel my-4 w-full max-w-3xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="envelope-flap mx-auto w-[min(100%,42rem)]" />
        <div className="rounded-b-2xl rounded-t-md border border-border bg-background shadow-2xl">
          <div className="flex items-start justify-between gap-3 border-b border-border px-5 py-4 sm:px-8">
            <div>
              <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
                {creating ? "New product" : "Product"}
              </p>
              <h2 className="mt-1 text-2xl font-semibold tracking-tight">
                {creating ? "Add product" : String(product.name ?? "")}
              </h2>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-md px-2 py-1 text-sm text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              Close
            </button>
          </div>
          <div className="px-5 py-5 sm:px-8">
            <ProductEditor
              key={creating ? "new" : String(product.id)}
              product={product}
              manufacturers={manufacturers}
              creating={creating}
              onDone={onClose}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
