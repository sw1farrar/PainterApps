import { NextResponse } from "next/server";

import { sanitizeLoginRedirect } from "@/lib/auth/login-redirect";
import { provisionCompanyFromSignupMetadata } from "@/lib/auth/provision-company";
import { createClient } from "@/lib/supabase/server";
import { acceptTeamInvite } from "@/lib/team/invites";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const inviteToken = searchParams.get("invite");
  const safeNext = sanitizeLoginRedirect(searchParams.get("next"));
  let next = safeNext ?? "/app/onboarding";

  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return NextResponse.redirect(
      `${origin}/login?error=${encodeURIComponent("Supabase is not configured.")}`,
    );
  }

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user && !user.email_confirmed_at) {
        const verifyParams = new URLSearchParams();
        if (user.email) verifyParams.set("email", user.email);
        if (safeNext) verifyParams.set("next", safeNext);
        const verifyQuery = verifyParams.toString();
        return NextResponse.redirect(
          `${origin}/verify-email${verifyQuery ? `?${verifyQuery}` : ""}`,
        );
      }

      if (user?.email_confirmed_at && user.user_metadata?.company_name) {
        await provisionCompanyFromSignupMetadata(
          user.id,
          user.email ?? "",
          user.user_metadata as Record<string, unknown>,
        );
      }

      if (inviteToken && user?.email) {
        const inviteResult = await acceptTeamInvite(
          inviteToken,
          user.id,
          user.email,
        );

        if (inviteResult.success) {
          next = "/app/dashboard";
        } else {
          return NextResponse.redirect(
            `${origin}/login?error=${encodeURIComponent(inviteResult.error)}`,
          );
        }
      }

      return NextResponse.redirect(`${origin}${next}`);
    }

    return NextResponse.redirect(
      `${origin}/login?error=${encodeURIComponent(error.message)}`,
    );
  }

  return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`);
}