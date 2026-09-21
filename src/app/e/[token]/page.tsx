import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { LetterDocument, letterLabels } from "@/components/estimates/LetterDocument";
import { loadLetterCompanyAdmin } from "@/lib/estimates/load-company";
import { supabaseAdmin } from "@/lib/supabase/server";

export const metadata = {
  title: "Estimate",
  robots: { index: false, follow: false },
};

export default async function PublicEstimatePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const db = supabaseAdmin();
  if (!db) notFound();
  const { data: estimate } = await db
    .from("estimates")
    .select(
      "id,number,status,zip,hourly_rate_snapshot,totals,notes,customer_id,created_at,view_token,company_id",
    )
    .eq("view_token", token)
    .maybeSingle();
  if (!estimate) notFound();
  if (estimate.status === "draft" || estimate.status === "declined") notFound();
  const [{ data: areas }, { data: customer }, letter, t] = await Promise.all([
    db
      .from("estimate_areas")
      .select("id,name,kind,length,width,height,opening_sqft,estimate_surfaces(*)")
      .eq("estimate_id", estimate.id)
      .order("sort"),
    estimate.customer_id
      ? db
          .from("customers")
          .select("id,name,phone,email,address,zip")
          .eq("id", estimate.customer_id)
          .maybeSingle()
      : Promise.resolve({ data: null }),
    loadLetterCompanyAdmin(estimate.company_id),
    getTranslations("app"),
  ]);

  return (
    <div className="min-h-screen bg-neutral-200 py-8">
      <LetterDocument
        estimate={estimate}
        areas={(areas ?? []).map((a) => ({
          ...a,
          estimate_surfaces: a.estimate_surfaces ?? [],
        }))}
        customer={customer}
        company={letter.company}
        showHours={letter.showHours}
        labels={letterLabels(t, letter.company.proposal_valid_days)}
      />
    </div>
  );
}
