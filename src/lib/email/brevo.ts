type SendEmailInput = {
  to: string;
  toName?: string;
  subject: string;
  html: string;
  tags?: string[];
};

export type SendEmailResult =
  | { success: true; messageId?: string }
  | { success: false; error: string };

type BrevoSender = {
  name: string;
  email: string;
};

function getSender(): BrevoSender {
  const email =
    process.env.BREVO_SENDER_EMAIL ??
    process.env.BREVO_FROM_EMAIL ??
    "hello@painterapps.com";
  const name = process.env.BREVO_SENDER_NAME ?? "PainterApps";

  return { name, email };
}

export function isBrevoConfigured(): boolean {
  return Boolean(process.env.BREVO_API_KEY);
}

export async function sendEmail(
  input: SendEmailInput,
): Promise<SendEmailResult> {
  const apiKey = process.env.BREVO_API_KEY;
  const sender = getSender();

  if (!apiKey) {
    console.log("[email] Mock send (Brevo not configured):", {
      from: `${sender.name} <${sender.email}>`,
      to: input.to,
      subject: input.subject,
      tags: input.tags,
    });
    return { success: true };
  }

  const response = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: {
      "api-key": apiKey,
      "Content-Type": "application/json",
      accept: "application/json",
    },
    body: JSON.stringify({
      sender,
      to: [{ email: input.to, name: input.toName ?? input.to }],
      subject: input.subject,
      htmlContent: input.html,
      tags: input.tags,
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    return {
      success: false,
      error: body || `Brevo error (${response.status})`,
    };
  }

  const data = (await response.json()) as { messageId?: string };
  return { success: true, messageId: data.messageId };
}