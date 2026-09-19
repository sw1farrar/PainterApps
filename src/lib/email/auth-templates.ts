type AuthLocale = "en" | "es";
type EmailAction =
  | "signup"
  | "invite"
  | "magiclink"
  | "recovery"
  | "email_change"
  | "reauthentication";

const COPY: Record<
  AuthLocale,
  Record<EmailAction, { subject: string; heading: string; body: string; cta: string }>
> = {
  en: {
    signup: {
      subject: "Your PainterApps confirmation code",
      heading: "Your confirmation code",
      body: "Enter this code in PainterApps to finish creating your account. It expires shortly.",
      cta: "Or confirm with this link",
    },
    invite: {
      subject: "You were invited to PainterApps",
      heading: "Accept the invite",
      body: "Follow the link to create your account. The link expires shortly.",
      cta: "Accept invite",
    },
    magiclink: {
      subject: "Your PainterApps sign-in link",
      heading: "Sign in",
      body: "Follow the link to sign in. It can only be used once.",
      cta: "Sign in",
    },
    recovery: {
      subject: "Reset your PainterApps password",
      heading: "Reset password",
      body: "We received a request to reset your password. Follow the link to choose a new one. If you did not ask for this, ignore the email.",
      cta: "Reset password",
    },
    email_change: {
      subject: "Confirm your new email",
      heading: "Confirm the new email",
      body: "Follow the link to confirm this as your PainterApps email.",
      cta: "Confirm email",
    },
    reauthentication: {
      subject: "Your PainterApps verification code",
      heading: "Verification code",
      body: "Use this code to verify it is you. It expires shortly.",
      cta: "Your code",
    },
  },
  es: {
    signup: {
      subject: "Su código de PainterApps",
      heading: "Su código de confirmación",
      body: "Escriba este código en PainterApps para terminar de crear su cuenta. Caduca pronto.",
      cta: "O confirme con este enlace",
    },
    invite: {
      subject: "Lo invitaron a PainterApps",
      heading: "Acepte la invitación",
      body: "Siga el enlace para crear su cuenta. El enlace caduca pronto.",
      cta: "Aceptar invitación",
    },
    magiclink: {
      subject: "Su enlace para entrar a PainterApps",
      heading: "Entrar",
      body: "Siga el enlace para entrar. Solo sirve una vez.",
      cta: "Entrar",
    },
    recovery: {
      subject: "Restablezca su contraseña de PainterApps",
      heading: "Restablecer contraseña",
      body: "Recibimos un pedido para restablecer su contraseña. Siga el enlace para elegir una nueva. Si no lo pidió, ignore el correo.",
      cta: "Restablecer contraseña",
    },
    email_change: {
      subject: "Confirme su correo nuevo",
      heading: "Confirme el correo nuevo",
      body: "Siga el enlace para confirmar este correo en PainterApps.",
      cta: "Confirmar correo",
    },
    reauthentication: {
      subject: "Su código de PainterApps",
      heading: "Código de verificación",
      body: "Use este código para confirmar que es usted. Caduca pronto.",
      cta: "Su código",
    },
  },
};

export function authLocale(value: unknown): AuthLocale {
  return value === "es" ? "es" : "en";
}

export function isEmailAction(value: string): value is EmailAction {
  return value in COPY.en;
}

export function confirmationUrl(input: {
  supabaseUrl: string;
  tokenHash: string;
  type: string;
  redirectTo: string;
}) {
  const site =
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ||
    "https://painterapps.com";
  const url = new URL(`${site}/auth/callback`);
  url.searchParams.set("token_hash", input.tokenHash);
  url.searchParams.set("type", input.type);
  if (input.redirectTo) url.searchParams.set("next", input.redirectTo);
  return url.toString();
}

export function authEmailContent(input: {
  locale: AuthLocale;
  action: EmailAction;
  confirmationUrl?: string;
  token?: string;
}) {
  const copy = COPY[input.locale][input.action];
  const codeLine = input.token
    ? `<p style="font-size:28px;font-weight:700;letter-spacing:0.18em">${input.token}</p>`
    : "";
  const linkLine = input.confirmationUrl
    ? `<p><a href="${input.confirmationUrl}">${copy.cta}</a></p>`
    : "";
  const html = `<div style="font-family:system-ui,sans-serif;line-height:1.5;color:#111">
  <p style="font-weight:600">${copy.heading}</p>
  <p>${copy.body}</p>
  ${codeLine}
  ${linkLine}
  <p style="font-size:12px;color:#666">PainterApps</p>
</div>`;
  const text = [
    copy.heading,
    "",
    copy.body,
    input.token ? `\n${input.token}` : "",
    input.confirmationUrl ? `\n${input.confirmationUrl}` : "",
    "",
  ].join("\n");
  return { subject: copy.subject, html, text };
}
