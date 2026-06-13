import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { acceptTeamInvite } from "@/lib/team/invites";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const inviteToken = searchParams.get("invite");
  let next = searchParams.get("next") ?? "/app/onboarding";

  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return NextResponse.redirect(
      `${origin}/login?error=${encodeURIComponent("Supabase is not configured.")}`,
    );
  }

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      if (inviteToken) {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (user?.email) {
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
      }

      return NextResponse.redirect(`${origin}${next}`);
    }

    return NextResponse.redirect(
      `${origin}/login?error=${encodeURIComponent(error.message)}`,
    );
  }

  return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`);
}