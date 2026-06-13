import { redirect } from "next/navigation";

import { requireSession } from "@/lib/auth/session";
import { OnboardingWizard } from "./OnboardingWizard";

export default async function OnboardingPage() {
  const session = await requireSession();

  if (session.company?.onboarding_complete) {
    redirect("/app/dashboard");
  }

  return <OnboardingWizard company={session.company} />;
}