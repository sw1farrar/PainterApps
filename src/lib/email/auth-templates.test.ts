import { describe, expect, it } from "vitest";
import { authEmailContent } from "./auth-templates";

describe("authEmailContent", () => {
  it("puts the signup OTP in the body", () => {
    const content = authEmailContent({
      locale: "en",
      action: "signup",
      token: "12345678",
      confirmationUrl: "https://example.test/confirm",
    });
    expect(content.subject).toMatch(/code/i);
    expect(content.html).toContain("12345678");
    expect(content.text).toContain("12345678");
    expect(content.html).toContain("https://example.test/confirm");
  });
});
