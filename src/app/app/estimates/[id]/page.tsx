import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { currentUserId } from "@/lib/auth/current-user";
import { createClient } from "@/lib/supabase/server";
import { addArea, addSurface, deleteArea } from "../actions";

export const metadata = { title: "Estimate" };

export default async function EstimateBuilderPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const userId = await currentUserId();
  if (!userId) redirect("/login?next=/app/estimates");
  const supabase = await createClient();
  if (!supabase) notFound();
  const { data: estimate } = await supabase
    .from("estimates")
    .select("id,number,status,zip,hourly_rate_snapshot,totals,notes,customer_id")
    .eq("id", id)
    .maybeSingle();
  if (!estimate) notFound();
  const [{ data: areas }, { data: rates }, { data: customer }] = await Promise.all([
    supabase
      .from("estimate_areas")
      .select("id,name,kind,length,width,height,estimate_surfaces(*)")
      .eq("estimate_id", id)
      .order("sort"),
    supabase
      .from("production_rates")
      .select("id,category,name,unit")
      .eq("user_id", userId)
      .order("sort"),
    estimate.customer_id
      ? supabase
          .from("customers")
          .select("name,address,zip")
          .eq("id", estimate.customer_id)
          .maybeSingle()
      : Promise.resolve({ data: null }),
  ]);
  const t = await getTranslations("app");
  const totals = (estimate.totals ?? {}) as {
    hours?: number;
    labor?: number;
    material?: number;
    total?: number;
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm text-muted-foreground">
            <Link href="/app/estimates" className="underline underline-offset-4">
              {t("estimatesTitle")}
            </Link>
          </p>
          <h1 className="text-2xl font-semibold tracking-tight">
            #{estimate.number} {customer?.name ?? t("walkIn")}
          </h1>
          <p className="text-sm text-muted-foreground">
            {estimate.zip} · ${Number(estimate.hourly_rate_snapshot).toFixed(0)}/hr
          </p>
        </div>
        <Button asChild variant="outline">
          <Link href={`/app/estimates/${id}/print`}>{t("letterPreview")}</Link>
        </Button>
      </div>

      <aside className="rounded-2xl border border-border bg-card p-4 text-sm">
        <p>
          {t("hours")}: {Number(totals.hours ?? 0).toFixed(1)}
        </p>
        <p>
          {t("labor")}: ${Number(totals.labor ?? 0).toFixed(2)}
        </p>
        <p>
          {t("materials")}: ${Number(totals.material ?? 0).toFixed(2)}
        </p>
        <p className="mt-2 text-lg font-semibold">
          {t("total")}: ${Number(totals.total ?? 0).toFixed(2)}
        </p>
      </aside>

      {(areas ?? []).map((area) => (
        <section key={area.id} className="rounded-2xl border border-border p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="font-medium">{area.name}</h2>
              <p className="text-xs text-muted-foreground">
                {area.kind} · {area.length}×{area.width}×{area.height}
              </p>
            </div>
            <form action={deleteArea}>
              <input type="hidden" name="estimate_id" value={id} />
              <input type="hidden" name="area_id" value={area.id} />
              <Button type="submit" variant="ghost" size="sm">
                {t("delete")}
              </Button>
            </form>
          </div>
          <ul className="mt-3 space-y-1 text-sm">
            {(area.estimate_surfaces ?? []).map((s) => (
              <li key={s.id} className="flex justify-between gap-3">
                <span>
                  {s.label} · {s.coats} {t("coats")} · {Number(s.qty).toFixed(0)}
                </span>
                <span>
                  {Number(s.hours_paint).toFixed(1)}h ${Number(s.amount).toFixed(0)}
                </span>
              </li>
            ))}
          </ul>
          <form action={addSurface} className="mt-3 flex flex-wrap gap-2">
            <input type="hidden" name="estimate_id" value={id} />
            <input type="hidden" name="area_id" value={area.id} />
            <select
              name="rate_id"
              required
              className="h-9 rounded-md border border-input bg-background px-2 text-sm"
            >
              {(rates ?? []).map((r) => (
                <option key={r.id} value={r.id}>
                  {r.category}: {r.name}
                </option>
              ))}
            </select>
            <select
              name="coats"
              defaultValue="2"
              className="h-9 rounded-md border border-input bg-background px-2 text-sm"
            >
              <option value="1">1 {t("coats")}</option>
              <option value="2">2 {t("coats")}</option>
              <option value="3">3 {t("coats")}</option>
            </select>
            <Input name="qty" placeholder={t("qtyOverride")} className="w-28" />
            <Input name="prep" placeholder={t("prepHours")} className="w-28" />
            <Button type="submit" size="sm">
              {t("addSurface")}
            </Button>
          </form>
        </section>
      ))}

      <form action={addArea} className="space-y-3 rounded-2xl border border-dashed border-border p-4">
        <h2 className="font-medium">{t("addArea")}</h2>
        <input type="hidden" name="estimate_id" value={id} />
        <Input name="name" placeholder={t("areaName")} required />
        <select
          name="kind"
          className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
        >
          <option value="room">{t("room")}</option>
          <option value="surface">{t("surface")}</option>
        </select>
        <div className="grid grid-cols-3 gap-2">
          <Input name="length" placeholder={t("length")} required />
          <Input name="width" placeholder={t("width")} />
          <Input name="height" placeholder={t("height")} defaultValue="8" />
        </div>
        <Button type="submit">{t("addArea")}</Button>
      </form>
    </div>
  );
}
