import { Webhook } from "standardwebhooks";
import { isBrevoConfigured, sendEmail } from "@/lib/email/brevo";
import {
  authEmailContent,
  authLocale,
  confirmationUrl,
  isEmailAction,
} from "@/lib/email/auth-templates";

export const runtime = "nodejs";

type HookPayload = {
  user: {
    email?: string;
    email_new?: string;
    user_metadata?: { locale?: string };
  };
  email_data: {
    token?: string;
    token_hash?: string;
    token_new?: string;
    token_hash_new?: string;
    redirect_to?: string;
    email_action_type?: string;
    email_new?: string;
  };
};

function hookSecret() {
  return (process.env.SEND_EMAIL_HOOK_SECRET ?? "").replace(
    /^v1,whsec_/,
    "",
  );
}

export async function POST(request: Request) {
  const secret = hookSecret();
  if (!secret) {
    return Response.json(
      { error: { message: "SEND_EMAIL_HOOK_SECRET is not set" } },
      { status: 501 },
    );
  }
  if (!isBrevoConfigured()) {
    return Response.json(
      { error: { message: "BREVO_API_KEY is not set" } },
      { status: 501 },
    );
  }

  const payload = await request.text();
  const headers = Object.fromEntries(request.headers);
  try {
    const verified = new Webhook(secret).verify(payload, headers) as HookPayload;
    const action = verified.email_data.email_action_type ?? "";
    const newInbox =
      verified.email_data.email_new || verified.user.email_new || "";
    const to =
      action === "email_change" && newInbox
        ? newInbox
        : verified.user.email;
    if (!to || !isEmailAction(action)) {
      return Response.json({});
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
    const usesLink = action !== "reauthentication";
    const tokenHash =
      action === "email_change"
        ? verified.email_data.token_hash_new || verified.email_data.token_hash
        : verified.email_data.token_hash;
    const token =
      action === "email_change"
        ? verified.email_data.token_new || verified.email_data.token
        : verified.email_data.token;
    const content = authEmailContent({
      locale: authLocale(verified.user.user_metadata?.locale),
      action,
      confirmationUrl:
        usesLink && supabaseUrl && tokenHash
          ? confirmationUrl({
              supabaseUrl,
              tokenHash,
              type: action,
              redirectTo: verified.email_data.redirect_to ?? "/app/settings",
            })
          : undefined,
      token,
    });

    const result = await sendEmail({
      to,
      subject: content.subject,
      html: content.html,
      text: content.text,
      tags: ["auth", action],
    });
    if (!result.success) {
      return Response.json(
        { error: { message: result.error } },
        { status: 500 },
      );
    }
    return Response.json({});
  } catch (error) {
    const message = error instanceof Error ? error.message : "invalid webhook";
    return Response.json({ error: { message } }, { status: 401 });
  }
}
