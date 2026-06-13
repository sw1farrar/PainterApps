const apiKey = process.env.BREVO_API_KEY;
const senderEmail = process.env.BREVO_SENDER_EMAIL || "hello@painterapps.com";
const senderName = process.env.BREVO_SENDER_NAME || "PainterApps";

const checks = [];

if (!apiKey) {
  checks.push({ test: "API key present", ok: false, detail: "BREVO_API_KEY missing" });
  console.log(JSON.stringify(checks, null, 2));
  process.exit(1);
}

checks.push({
  test: "API key present",
  ok: true,
  detail: `set (${apiKey.length} chars)`,
});

const accountRes = await fetch("https://api.brevo.com/v3/account", {
  headers: { "api-key": apiKey, accept: "application/json" },
});
checks.push({
  test: "Brevo API auth",
  ok: accountRes.ok,
  detail: accountRes.ok
    ? "authenticated"
    : `HTTP ${accountRes.status}: ${(await accountRes.text()).slice(0, 200)}`,
});

const sendersRes = await fetch("https://api.brevo.com/v3/senders", {
  headers: { "api-key": apiKey, accept: "application/json" },
});

if (sendersRes.ok) {
  const data = await sendersRes.json();
  const senders = (data.senders || []).map(
    (s) => `${s.email} (${s.active ? "active" : "inactive"})`,
  );
  const senderFound = (data.senders || []).some((s) => s.email === senderEmail);
  checks.push({
    test: "Sender registered in Brevo",
    ok: senderFound,
    detail: senderFound
      ? `${senderEmail} found`
      : `configured sender ${senderEmail} not in list: ${senders.join(", ") || "none"}`,
  });
} else {
  checks.push({
    test: "Sender list",
    ok: false,
    detail: `HTTP ${sendersRes.status}`,
  });
}

const sendRes = await fetch("https://api.brevo.com/v3/smtp/email", {
  method: "POST",
  headers: {
    "api-key": apiKey,
    "Content-Type": "application/json",
    accept: "application/json",
  },
  body: JSON.stringify({
    sender: { email: senderEmail, name: senderName },
    to: [{ email: senderEmail, name: "PainterApps Test" }],
    subject: "PainterApps email system test",
    htmlContent:
      "<p>If you received this, Brevo transactional email is working for painterapps.com.</p>",
    tags: ["system-test"],
  }),
});

const sendBody = await sendRes.text();
checks.push({
  test: "Send test email via Brevo",
  ok: sendRes.ok,
  detail: sendRes.ok
    ? `sent to ${senderEmail}`
    : sendBody.slice(0, 400),
});

console.log(JSON.stringify(checks, null, 2));
process.exit(checks.every((c) => c.ok) ? 0 : 1);