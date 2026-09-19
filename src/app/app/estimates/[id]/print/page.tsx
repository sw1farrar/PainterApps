import { notFound, redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { currentUserId } from "@/lib/auth/current-user";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Estimate letter" };

export default async function EstimatePrintPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const userId = await currentUserId();
  if (!userId) redirect("/login");
  const supabase = await createClient();
  if (!supabase) notFound();
  const { data: estimate } = await supabase
    .from("estimates")
    .select("*")
    .eq("id", id)
    .eq("user_id", userId)
    .maybeSingle();
  if (!estimate) notFound();
  const [{ data: settings }, { data: customer }, { data: areas }] =
    await Promise.all([
      supabase
        .from("company_settings")
        .select("company_name,phone,show_hours_on_proposal")
        .eq("user_id", userId)
        .maybeSingle(),
      estimate.customer_id
        ? supabase
            .from("customers")
            .select("name,address,zip,phone,email")
            .eq("id", estimate.customer_id)
            .maybeSingle()
        : Promise.resolve({ data: null }),
      supabase
        .from("estimate_areas")
        .select("name,kind,length,width,height,estimate_surfaces(*)")
        .eq("estimate_id", id),
    ]);
  const t = await getTranslations("app");
  const totals = (estimate.totals ?? {}) as {
    hours?: number;
    labor?: number;
    material?: number;
    total?: number;
  };
  const showHours = Boolean(settings?.show_hours_on_proposal);

  return (
    <div className="letter-sheet mx-auto bg-white text-black">
      <style>{`
        @page { size: letter; margin: 0.6in; }
        .letter-sheet {
          width: 8.5in;
          min-height: 11in;
          padding: 0.6in;
          box-sizing: border-box;
        }
        @media print {
          body { background: white; }
          header, footer, aside, nav { display: none !important; }
          .letter-sheet { padding: 0; width: auto; min-height: auto; }
        }
      `}</style>
      <div className="flex justify-between gap-6 border-b border-neutral-300 pb-4">
        <div>
          <p className="text-xs uppercase tracking-[0.2em]">PainterApps</p>
          <h1 className="text-2xl font-semibold">
            {settings?.company_name || "Estimate"}
          </h1>
          <p className="text-sm">{settings?.phone}</p>
        </div>
        <div className="text-right text-sm">
          <p>
            {t("estimateNo")} #{estimate.number}
          </p>
          <p>{new Date(estimate.created_at).toLocaleDateString()}</p>
          <p>{estimate.zip}</p>
        </div>
      </div>
      <section className="mt-4 text-sm">
        <p className="font-medium">{t("preparedFor")}</p>
        <p>{customer?.name ?? t("walkIn")}</p>
        <p>{customer?.address}</p>
        <p>{customer?.zip}</p>
      </section>
      <section className="mt-6 space-y-4 text-sm">
        {(areas ?? []).map((area) => (
          <div key={area.name}>
            <p className="font-medium">
              {area.name}{" "}
              <span className="font-normal text-neutral-600">
                {area.length}×{area.width}×{area.height}
              </span>
            </p>
            <ul className="mt-1">
              {(area.estimate_surfaces ?? []).map((s) => (
                <li key={s.id} className="flex justify-between">
                  <span>
                    {s.label}, {s.coats} {t("coats")}
                    {showHours ? ` · ${Number(s.hours_paint).toFixed(1)}h` : ""}
                  </span>
                  <span>${Number(s.amount).toFixed(2)}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </section>
      <section className="mt-8 border-t border-neutral-300 pt-4 text-sm">
        {showHours ? (
          <p>
            {t("hours")}: {Number(totals.hours ?? 0).toFixed(1)}
          </p>
        ) : null}
        <p>
          {t("labor")}: ${Number(totals.labor ?? 0).toFixed(2)}
        </p>
        <p>
          {t("materials")}: ${Number(totals.material ?? 0).toFixed(2)}
        </p>
        <p className="mt-2 text-xl font-semibold">
          {t("total")}: ${Number(totals.total ?? 0).toFixed(2)}
        </p>
      </section>
      <p className="mt-10 text-xs text-neutral-600">
        PainterApps is independent. Not affiliated with any paint manufacturer.
        Verify current TDS and local codes before you specify or apply.
      </p>
    </div>
  );
}
