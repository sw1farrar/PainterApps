import { NextResponse } from "next/server";

import { isBrevoConfigured, sendEmail } from "@/lib/email";

const TEST_HEADER = "x-painterapps-test";
const TEST_TOKEN = "painterapps-email-check-2026";

export async function GET(request: Request) {
  if (request.headers.get(TEST_HEADER) !== TEST_TOKEN) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return NextResponse.json({
    brevoConfigured: isBrevoConfigured(),
    senderEmail: process.env.BREVO_SENDER_EMAIL ?? "hello@painterapps.com",
    senderName: process.env.BREVO_SENDER_NAME ?? "PainterApps",
  });
}

export async function POST(request: Request) {
  if (request.headers.get(TEST_HEADER) !== TEST_TOKEN) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!isBrevoConfigured()) {
    return NextResponse.json(
      { success: false, error: "BREVO_API_KEY not set on server" },
      { status: 500 },
    );
  }

  const senderEmail =
    process.env.BREVO_SENDER_EMAIL ?? "hello@painterapps.com";

  const result = await sendEmail({
    to: senderEmail,
    toName: "PainterApps System Test",
    subject: "PainterApps production email test",
    html: "<p>Production Brevo email is working.</p>",
    tags: ["system-test"],
  });

  return NextResponse.json(result, { status: result.success ? 200 : 500 });
}