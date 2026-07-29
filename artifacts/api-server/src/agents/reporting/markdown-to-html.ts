// A minimal, dependency-free Markdown -> HTML converter covering the subset
// this module's own reports actually use (headers, tables, bullet lists,
// bold text, paragraphs) - not a general-purpose Markdown implementation.
function escapeHtml(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function inline(text: string): string {
  return escapeHtml(text).replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
}

export function markdownToHtml(markdown: string): string {
  const lines = markdown.split("\n");
  const html: string[] = [];
  let inList = false;
  let inTable = false;

  const closeList = () => {
    if (inList) {
      html.push("</ul>");
      inList = false;
    }
  };
  const closeTable = () => {
    if (inTable) {
      html.push("</table>");
      inTable = false;
    }
  };

  for (const line of lines) {
    if (/^#{1,3}\s/.test(line)) {
      closeList();
      closeTable();
      const level = line.match(/^#+/)![0].length;
      html.push(`<h${level}>${inline(line.replace(/^#+\s*/, ""))}</h${level}>`);
    } else if (/^\|/.test(line)) {
      closeList();
      if (/^\|[\s-]+\|$/.test(line.replace(/\|---+/g, "|---"))) continue; // separator row
      if (!inTable) {
        html.push("<table>");
        inTable = true;
      }
      const cells = line
        .split("|")
        .slice(1, -1)
        .map((c) => c.trim());
      html.push(`<tr>${cells.map((c) => `<td>${inline(c)}</td>`).join("")}</tr>`);
    } else if (/^-\s/.test(line)) {
      closeTable();
      if (!inList) {
        html.push("<ul>");
        inList = true;
      }
      html.push(`<li>${inline(line.replace(/^-\s*/, ""))}</li>`);
    } else if (line.trim() === "") {
      closeList();
      closeTable();
    } else {
      closeList();
      closeTable();
      html.push(`<p>${inline(line)}</p>`);
    }
  }
  closeList();
  closeTable();

  return `<!doctype html><html><head><meta charset="utf-8"><style>
    body { font-family: sans-serif; margin: 2em; }
    table { border-collapse: collapse; width: 100%; margin-bottom: 1em; }
    td, th { border: 1px solid #ccc; padding: 4px 8px; text-align: left; }
  </style></head><body>${html.join("\n")}</body></html>`;
}
