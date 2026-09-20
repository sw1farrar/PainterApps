import { type EmailOtpType } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { safeNextPath } from "@/lib/auth/paths";

const OTP_TYPES: EmailOtpType[] = [
  "signup",
  "invite",
  "magiclink",
  "recovery",
  "email_change",
  "email",
];

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const tokenHash =
    searchParams.get("token_hash") ?? searchParams.get("token");
  const type = searchParams.get("type");
  const next = safeNextPath(searchParams.get("next"));
  const supabase = await createClient();

  if (supabase && tokenHash && type && OTP_TYPES.includes(type as EmailOtpType)) {
    const { error } = await supabase.auth.verifyOtp({
      type: type as EmailOtpType,
      token_hash: tokenHash,
    });
    if (!error) {
      const { data: sessionUser } = await supabase.auth.getUser();
      const uid = sessionUser.user?.id;
      if (uid) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("access_enabled")
          .eq("user_id", uid)
          .maybeSingle();
        if (profile?.access_enabled === false) {
          await supabase.auth.signOut();
          return NextResponse.redirect(`${origin}/login?error=disabled`);
        }
      }
      const dest = type === "recovery" ? "/login/reset" : next;
      return NextResponse.redirect(`${origin}${dest}`);
    }
  }

  if (supabase && code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      const { data: sessionUser } = await supabase.auth.getUser();
      const uid = sessionUser.user?.id;
      if (uid) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("access_enabled")
          .eq("user_id", uid)
          .maybeSingle();
        if (profile?.access_enabled === false) {
          await supabase.auth.signOut();
          return NextResponse.redirect(`${origin}/login?error=disabled`);
        }
      }
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth`);
}
