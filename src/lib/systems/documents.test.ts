import { describe, expect, it } from "vitest";
import { documentPublicUrl } from "./document-url";

describe("documentPublicUrl", () => {
  it("returns the manufacturer URL when nothing is stored", () => {
    expect(documentPublicUrl(null, "https://example.com/pds")).toBe(
      "https://example.com/pds",
    );
  });

  it("points at the public tds-pdfs bucket when a file is stored", () => {
    const prev = process.env.NEXT_PUBLIC_SUPABASE_URL;
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
    expect(documentPublicUrl("sw-duration/abc.pdf", "https://example.com/pds")).toBe(
      "https://example.supabase.co/storage/v1/object/public/tds-pdfs/sw-duration/abc.pdf",
    );
    process.env.NEXT_PUBLIC_SUPABASE_URL = prev;
  });
});
