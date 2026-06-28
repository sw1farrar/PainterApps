console.log(
  JSON.stringify({
    BREVO_API_KEY: process.env.BREVO_API_KEY
      ? `set (${process.env.BREVO_API_KEY.length} chars)`
      : "missing",
    BREVO_SENDER_EMAIL: process.env.BREVO_SENDER_EMAIL || "missing",
    BREVO_SENDER_NAME: process.env.BREVO_SENDER_NAME || "missing",
    XAI_API_KEY: process.env.XAI_API_KEY
      ? `set (${process.env.XAI_API_KEY.length} chars)`
      : "missing",
    XAI_MODEL: process.env.XAI_MODEL || "missing",
    VERCEL_ENV: process.env.VERCEL_ENV || "missing",
  }),
);