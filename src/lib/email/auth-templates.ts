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
      subject: "Confirm your PainterApps account",
      heading: "Confirm this email",
      body: "Follow the link to finish creating your PainterApps account. The link expires shortly.",
      cta: "Confirm email",
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
      subject: "Confirme su cuenta de PainterApps",
      heading: "Confirme este correo",
      body: "Siga el enlace para terminar de crear su cuenta. El enlace caduca pronto.",
      cta: "Confirmar correo",
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
  const url = new URL(`${input.supabaseUrl.replace(/\/$/, "")}/auth/v1/verify`);
  url.searchParams.set("token", input.tokenHash);
  url.searchParams.set("type", input.type);
  if (input.redirectTo) url.searchParams.set("redirect_to", input.redirectTo);
  return url.toString();
}

export function authEmailContent(input: {
  locale: AuthLocale;
  action: EmailAction;
  confirmationUrl?: string;
  token?: string;
}) {
  const copy = COPY[input.locale][input.action];
  const actionLine = input.confirmationUrl
    ? `<p><a href="${input.confirmationUrl}">${copy.cta}</a></p>`
    : `<p><strong>${input.token ?? ""}</strong></p>`;
  const html = `<div style="font-family:system-ui,sans-serif;line-height:1.5;color:#111">
  <p style="font-weight:600">${copy.heading}</p>
  <p>${copy.body}</p>
  ${actionLine}
  <p style="font-size:12px;color:#666">PainterApps</p>
</div>`;
  const text = input.confirmationUrl
    ? `${copy.heading}\n\n${copy.body}\n\n${input.confirmationUrl}\n`
    : `${copy.heading}\n\n${copy.body}\n\n${input.token ?? ""}\n`;
  return { subject: copy.subject, html, text };
}
