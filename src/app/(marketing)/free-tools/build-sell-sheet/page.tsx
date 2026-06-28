import { Suspense } from "react";
import BuildSellSheetContent from "@/components/BuildSellSheetContent";
import { getSellSheetRecord } from "@/app/app/(portal)/sell-sheets/actions";
import { getSession } from "@/lib/auth/session";
import {
  EMPTY_BENEFIT_LIBRARY,
  parseBenefitLibrary,
} from "@/lib/sell-sheet/benefit-library";
import { parseSellSheetLibrary } from "@/lib/sell-sheet/company-library";

type BuildSellSheetPageProps = {
  searchParams: Promise<{ edit?: string; new?: string }>;
};

export default async function BuildSellSheetPage({
  searchParams,
}: BuildSellSheetPageProps) {
  const { edit, new: newParam } = await searchParams;
  const forceNew = newParam != null && newParam !== "0";
  const session = await getSession();
  const editRequested = Boolean(edit) && !forceNew;
  const loaded =
    editRequested && session ? await getSellSheetRecord(edit!) : null;
  const editRequiresSignIn = editRequested && !session;

  const companyBranding = session?.company
    ? {
        companyName: session.company.name,
        logoUrl: session.company.logo_url,
      }
    : null;

  const benefitLibrary = session?.company
    ? parseBenefitLibrary(session.company.sell_sheet_benefit_library)
    : EMPTY_BENEFIT_LIBRARY;
  const paintSystemLibrary = session?.company
    ? parseSellSheetLibrary(session.company.sell_sheet_paint_system_library)
    : [];

  return (
    <Suspense fallback={null}>
      <BuildSellSheetContent
        key={forceNew ? `new-${newParam}` : (edit ?? "new")}
        editId={loaded ? edit : undefined}
        initialData={loaded?.data}
        companyBranding={companyBranding}
        initialBenefitLibrary={benefitLibrary}
        initialPaintSystemLibrary={paintSystemLibrary}
        isLoggedIn={Boolean(session)}
        editRequiresSignIn={editRequiresSignIn}
        forceNew={forceNew}
      />
    </Suspense>
  );
}