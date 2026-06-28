import { redirect } from "next/navigation";

import { isSiteAdmin, requireSession } from "@/lib/auth/session";
import {
  companyEnabledFeatures,
  safePortalHome,
} from "@/lib/auth/company-features";

export default async function AppIndexPage() {
  const session = await requireSession();

  if (isSiteAdmin(session)) {
    redirect("/app/admin");
  }

  if (!session.company?.onboarding_complete) {
    redirect("/app/onboarding");
  }

  redirect(safePortalHome(companyEnabledFeatures(session.company)));
}