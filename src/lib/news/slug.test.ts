import { describe, expect, it } from "vitest";
import { renderMarkdown } from "./markdown";
import { slugify } from "./slug";

describe("slugify", () => {
  it("builds a URL-safe slug", () => {
    expect(slugify("Record the TDS revision before you specify")).toBe(
      "record-the-tds-revision-before-you-specify",
    );
  });
});

describe("renderMarkdown", () => {
  it("escapes HTML then applies links and bold", () => {
    const html = renderMarkdown(
      "See **TDS** at [EPA](https://www.epa.gov).\n\n<script>x</script>",
    );
    expect(html).toContain("<strong>TDS</strong>");
    expect(html).toContain('href="https://www.epa.gov"');
    expect(html).toContain("&lt;script&gt;");
    expect(html).not.toContain("<script>");
  });
});
