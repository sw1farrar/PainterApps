import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { PortalQuoteView } from "@/components/quotes/PortalQuoteView";
import type { Company, Customer, Quote, QuoteTier } from "@/types/database";

type PageProps = {
  params: Promise<{ slug: string; id: string }>;
  searchParams: Promise<{ portal_token?: string }>;
};

export default async function PortalQuotePage({
  params,
  searchParams,
}: PageProps) {
  const { slug, id } = await params;
  const { portal_token: portalToken } = await searchParams;

  if (!portalToken) notFound();

  const supabase = createAdminClient();

  const { data: company } = await supabase
    .from("companies")
    .select("*")
    .eq("slug", slug)
    .single();

  if (!company) notFound();

  const { data: quote } = await supabase
    .from("quotes")
    .select("*, customers(*)")
    .eq("id", id)
    .eq("company_id", company.id)
    .single();

  if (!quote) notFound();

  const customer = (quote as Quote & { customers: Customer }).customers;

  if (!customer || customer.portal_token !== portalToken) notFound();

  const { data: tiers } = await supabase
    .from("quote_tiers")
    .select("*")
    .eq("quote_id", id)
    .order("price");

  if (!tiers?.length) notFound();

  return (
    <div className="portal-shell site-viewport-shell min-h-0">
      <div
        data-site-scroll-main
        className="site-scroll-main mx-auto w-full max-w-6xl px-4 py-10 sm:px-6 lg:py-16"
      >
        <PortalQuoteView
          quote={quote as Quote}
          tiers={tiers as QuoteTier[]}
          companyName={(company as Company).name}
          companyLogoUrl={(company as Company).logo_url}
          companyPhone={(company as Company).phone}
          companyEmail={(company as Company).email}
          customerName={customer.name}
          portalToken={portalToken}
        />
      </div>
    </div>
  );
}