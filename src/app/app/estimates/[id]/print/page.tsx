import { notFound, redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { LetterDocument, letterLabels } from "@/components/estimates/LetterDocument";
import { currentUserId } from "@/lib/auth/current-user";
import { loadLetterCompany } from "@/lib/estimates/load-company";
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
    .select(
      "id,number,status,zip,hourly_rate_snapshot,totals,notes,customer_id,created_at,view_token",
    )
    .eq("id", id)
    .maybeSingle();
  if (!estimate) notFound();
  const [{ data: areas }, { data: customer }, letter, t] = await Promise.all([
    supabase
      .from("estimate_areas")
      .select("id,name,kind,length,width,height,opening_sqft,estimate_surfaces(*)")
      .eq("estimate_id", id)
      .order("sort"),
    estimate.customer_id
      ? supabase
          .from("customers")
          .select("id,name,phone,email,address,zip")
          .eq("id", estimate.customer_id)
          .maybeSingle()
      : Promise.resolve({ data: null }),
    loadLetterCompany(),
    getTranslations("app"),
  ]);

  return (
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
  );
}
