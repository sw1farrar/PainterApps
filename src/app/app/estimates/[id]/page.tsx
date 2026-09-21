import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { EstimateLetter } from "@/components/estimates/EstimateLetter";
import { currentAccess, requireFeature } from "@/lib/auth/access";
import { currentUserId } from "@/lib/auth/current-user";
import { isBrevoConfigured } from "@/lib/email/brevo";
import { loadLetterCompany } from "@/lib/estimates/load-company";
import { createClient } from "@/lib/supabase/server";
import { ensureCompany } from "../actions";

export const metadata = { title: "Estimate" };

export default async function EstimateBuilderPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  await requireFeature("estimate_pro", "/app/estimates");
  await ensureCompany();
  const userId = await currentUserId();
  if (!userId) redirect("/login?next=/app/estimates");
  const supabase = await createClient();
  if (!supabase) notFound();
  const access = await currentAccess();
  const { data: estimate } = await supabase
    .from("estimates")
    .select(
      "id,number,status,zip,hourly_rate_snapshot,totals,notes,customer_id,created_at,view_token",
    )
    .eq("id", id)
    .maybeSingle();
  if (!estimate) notFound();

  let ratesQuery = supabase
    .from("production_rates")
    .select("id,category,name,unit")
    .order("sort");
  ratesQuery = access?.companyId
    ? ratesQuery.eq("company_id", access.companyId)
    : ratesQuery.eq("user_id", userId);

  const [{ data: areas }, { data: rates }, { data: customer }, { data: customers }, letter] =
    await Promise.all([
      supabase
        .from("estimate_areas")
        .select(
          "id,name,kind,length,width,height,opening_sqft,estimate_surfaces(*)",
        )
        .eq("estimate_id", id)
        .order("sort"),
      ratesQuery,
      estimate.customer_id
        ? supabase
            .from("customers")
            .select("id,name,phone,email,address,zip")
            .eq("id", estimate.customer_id)
            .maybeSingle()
        : Promise.resolve({ data: null }),
      supabase
        .from("customers")
        .select("id,name,phone,email,address,zip")
        .order("name"),
      loadLetterCompany(),
    ]);

  const t = await getTranslations("app");

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        <Link href="/app/estimates" className="underline underline-offset-4">
          {t("estimatesTitle")}
        </Link>
      </p>
      <EstimateLetter
        estimate={estimate}
        areas={(areas ?? []).map((a) => ({
          ...a,
          estimate_surfaces: a.estimate_surfaces ?? [],
        }))}
        customer={customer}
        customers={customers ?? []}
        company={letter.company}
        rates={rates ?? []}
        showHours={letter.showHours}
        editable
        emailConfigured={isBrevoConfigured()}
      />
    </div>
  );
}
