import { redirect } from "next/navigation";
import { requireOnboarded } from "@/lib/auth/session";
import { loadQuotesListCards } from "@/lib/quotes/load-quotes-list";
import { QuotesHub } from "@/components/quotes/QuotesHub";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams: Promise<{ workspace?: string; step?: string }>;
};

export default async function QuotesPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const workspace = params.workspace?.trim();

  if (workspace === "new") {
    redirect("/app/quotes/new");
  }

  if (workspace) {
    const step = params.step?.trim();
    const query = step ? `?step=${encodeURIComponent(step)}` : "";
    redirect(`/app/quotes/${workspace}${query}`);
  }

  const { company } = await requireOnboarded();
  const cards = await loadQuotesListCards(company!.id);

  return <QuotesHub quotes={cards} />;
}