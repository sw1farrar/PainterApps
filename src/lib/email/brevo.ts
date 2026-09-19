type SendEmailInput = {
  to: string;
  toName?: string;
  subject: string;
  html: string;
  text?: string;
  tags?: string[];
};

export type SendEmailResult =
  | { success: true; messageId?: string }
  | { success: false; error: string };

function getSender() {
  return {
    email:
      process.env.BREVO_SENDER_EMAIL ??
      process.env.BREVO_FROM_EMAIL ??
      "hello@painterapps.com",
    name: process.env.BREVO_SENDER_NAME ?? "PainterApps",
  };
}

export function isBrevoConfigured() {
  return Boolean(process.env.BREVO_API_KEY);
}

export async function sendEmail(
  input: SendEmailInput,
): Promise<SendEmailResult> {
  const apiKey = process.env.BREVO_API_KEY;
  const sender = getSender();

  if (!apiKey) {
    return { success: false, error: "BREVO_API_KEY is not configured" };
  }

  const response = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: {
      accept: "application/json",
      "content-type": "application/json",
      "api-key": apiKey,
    },
    body: JSON.stringify({
      sender,
      to: [{ email: input.to, name: input.toName || undefined }],
      subject: input.subject,
      htmlContent: input.html,
      textContent: input.text,
      tags: input.tags,
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    return {
      success: false,
      error: `Brevo error (${response.status}): ${body || response.statusText}`,
    };
  }

  const data = (await response.json().catch(() => ({}))) as {
    messageId?: string;
  };
  return { success: true, messageId: data.messageId };
}
