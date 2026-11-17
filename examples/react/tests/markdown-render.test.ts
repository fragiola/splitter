import { describe, expect, it } from "vitest";
import {
    escapeHtml,
    renderMarkdown,
} from "../src/examples/markdown-editor/render.ts";

// The markdown editor's preview puts the renderer's output in the page as HTML, so the renderer
// must escape everything it reads: the only tags in its output are its own, without attributes.

describe("the markdown editor's renderer", () => {
    it("escapes the five HTML-significant characters", () => {
        expect(escapeHtml(`<a href="x">&'</a>`)).toBe(
            "&lt;a href=&quot;x&quot;&gt;&amp;&#39;&lt;/a&gt;",
        );
    });

    it("escapes HTML wherever it appears", () => {
        const sources = [
            "<script>alert(1)</script>",
            "# <img src=x onerror=alert(1)>",
            "- <b>item</b>",
            "1. <i>one</i>",
            "a `<code>` span and **<u>bold</u>**",
            "```\n<div>block</div>\n```",
        ];
        for (const source of sources) {
            const html = renderMarkdown(source);
            const tags = [...html.matchAll(/<\/?([a-z0-9]+)([^>]*)>/g)];
            for (const [, name, attributes] of tags) {
                expect(
                    [
                        "p",
                        "h1",
                        "ul",
                        "ol",
                        "li",
                        "code",
                        "pre",
                        "strong",
                        "em",
                    ],
                    `${source} → ${html}`,
                ).toContain(name);
                expect(attributes, `${source} → ${html}`).toBe("");
            }
            expect(html).toContain("&lt;");
        }
    });

    it("renders headings, paragraphs, lists, code and emphasis", () => {
        expect(
            renderMarkdown(
                [
                    "# Title",
                    "",
                    "Some **bold**, *italic* and _italic_ text",
                    "on two lines.",
                    "",
                    "- one",
                    "- `two`",
                    "",
                    "1. first",
                    "2. second",
                    "",
                    "```",
                    "const a = 1 < 2;",
                    "```",
                    "### Small",
                ].join("\n"),
            ),
        ).toBe(
            [
                "<h1>Title</h1>",
                "<p>Some <strong>bold</strong>, <em>italic</em> and <em>italic</em> text on two lines.</p>",
                "<ul><li>one</li><li><code>two</code></li></ul>",
                "<ol><li>first</li><li>second</li></ol>",
                "<pre><code>const a = 1 &lt; 2;</code></pre>",
                "<h3>Small</h3>",
            ].join("\n"),
        );
    });

    it("leaves emphasis marks inside inline code alone", () => {
        expect(renderMarkdown("`**not bold**`")).toBe(
            "<p><code>**not bold**</code></p>",
        );
    });
});
