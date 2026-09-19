function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function inline(value: string) {
  return escapeHtml(value)
    .replace(
      /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g,
      '<a href="$2" rel="noreferrer" target="_blank">$1</a>',
    )
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/_([^_]+)_/g, "<em>$1</em>");
}

/** Small, escaped markdown subset for editor-authored news bodies. */
export function renderMarkdown(source: string) {
  const blocks = source.replace(/\r\n/g, "\n").trim().split(/\n{2,}/);
  return blocks
    .map((block) => {
      const lines = block.split("\n");
      if (lines.every((l) => l.trim().startsWith("- "))) {
        const items = lines
          .map((l) => `<li>${inline(l.replace(/^\s*-\s+/, ""))}</li>`)
          .join("");
        return `<ul>${items}</ul>`;
      }
      if (block.startsWith("## ")) {
        return `<h2>${inline(block.slice(3))}</h2>`;
      }
      if (block.startsWith("# ")) {
        return `<h2>${inline(block.slice(2))}</h2>`;
      }
      return `<p>${lines.map(inline).join("<br/>")}</p>`;
    })
    .join("");
}
