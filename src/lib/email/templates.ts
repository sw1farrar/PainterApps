function layout(content: string): string {
  return `<!DOCTYPE html>
<html>
  <body style="margin:0;padding:0;background:#0f172a;font-family:Arial,sans-serif;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#0f172a;padding:32px 16px;">
      <tr>
        <td align="center">
          <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#1e293b;border-radius:12px;padding:32px;">
            <tr>
              <td style="color:#e2e8f0;font-size:15px;line-height:1.6;">
                ${content}
              </td>
            </tr>
          </table>
          <p style="color:#64748b;font-size:12px;margin-top:16px;">PainterApps</p>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

function button(href: string, label: string): string {
  return `<p style="margin:24px 0 0;">
    <a href="${href}" style="display:inline-block;background:#3b82f6;color:#ffffff;text-decoration:none;padding:12px 24px;border-radius:8px;font-weight:600;">
      ${label}
    </a>
  </p>`;
}

export function quoteSentEmail(input: {
  customerName: string;
  companyName: string;
  portalUrl: string;
}) {
  return {
    subject: `Your painting quote from ${input.companyName}`,
    html: layout(`
      <p>Hi ${input.customerName},</p>
      <p>Your quote from <strong>${input.companyName}</strong> is ready to review.</p>
      ${button(input.portalUrl, "View and accept your quote")}
      <p style="color:#94a3b8;font-size:13px;margin-top:24px;">If the button doesn't work, copy this link:<br/>
      <a href="${input.portalUrl}" style="color:#60a5fa;">${input.portalUrl}</a></p>
    `),
    tags: ["quote-sent"],
  };
}

export function quoteAcceptedEmail(input: {
  customerName: string;
  companyName: string;
  jobAddress: string;
  tierLabel: string;
  price: string;
  quoteUrl: string;
}) {
  return {
    subject: `Quote accepted — ${input.customerName}`,
    html: layout(`
      <p><strong>${input.customerName}</strong> accepted your quote for <strong>${input.jobAddress}</strong>.</p>
      <p>Package: <strong>${input.tierLabel}</strong> · ${input.price}</p>
      ${button(input.quoteUrl, "View quote & job")}
    `),
    tags: ["quote-accepted"],
  };
}

export function quoteDeclinedEmail(input: {
  customerName: string;
  jobAddress: string;
  quoteUrl: string;
}) {
  return {
    subject: `Quote declined — ${input.customerName}`,
    html: layout(`
      <p><strong>${input.customerName}</strong> declined the quote for <strong>${input.jobAddress}</strong>.</p>
      <p>Follow up from your dashboard to send a revised proposal.</p>
      ${button(input.quoteUrl, "Open quote")}
    `),
    tags: ["quote-declined"],
  };
}

export function teamInviteEmail(input: {
  companyName: string;
  role: string;
  inviteUrl: string;
}) {
  return {
    subject: `Join ${input.companyName} on PainterApps`,
    html: layout(`
      <p>You've been invited to join <strong>${input.companyName}</strong> as a <strong>${input.role}</strong>.</p>
      ${button(input.inviteUrl, "Accept your invite")}
      <p style="color:#94a3b8;font-size:13px;margin-top:24px;">This link expires in 7 days.</p>
    `),
    tags: ["team-invite"],
  };
}