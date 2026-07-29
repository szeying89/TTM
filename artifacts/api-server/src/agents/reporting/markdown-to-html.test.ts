import { describe, expect, it } from "vitest";
import { markdownToHtml } from "./markdown-to-html.js";

describe("markdownToHtml", () => {
  it("converts headers, bold text, lists, and tables", () => {
    const html = markdownToHtml(
      [
        "# Title",
        "",
        "**Confidence score:** 80/100",
        "",
        "- item one",
        "- item two",
        "",
        "| A | B |",
        "|---|---|",
        "| 1 | 2 |",
      ].join("\n"),
    );

    expect(html).toContain("<h1>Title</h1>");
    expect(html).toContain("<strong>Confidence score:</strong> 80/100");
    expect(html).toContain("<li>item one</li>");
    expect(html).toContain("<li>item two</li>");
    expect(html).toContain("<table>");
    expect(html).toContain("<td>1</td>");
    expect(html).toContain("<td>2</td>");
  });

  it("escapes HTML-significant characters", () => {
    const html = markdownToHtml("Risk: score < 5 & > 100");
    expect(html).toContain("score &lt; 5 &amp; &gt; 100");
  });
});
