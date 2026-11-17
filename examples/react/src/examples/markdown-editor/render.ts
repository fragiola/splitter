// A minimal Markdown renderer for the preview, written for this example (no library): headings,
// paragraphs, lists, fenced code blocks, inline code, bold and italic. It is not CommonMark.
//
// Its output is safe to put in the page as HTML by construction: every piece of the source is
// escaped first (`&`, `<`, `>`, `"`, `'`), and the only markup it adds is a fixed set of tags
// without attributes. Code an app renders from untrusted users still deserves a real parser and
// a sanitizer.

/** The text with the five HTML-significant characters escaped. */
export function escapeHtml(text: string): string {
    return text
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#39;");
}

/** Bold and italic in escaped text (`**bold**`, `*italic*`, `_italic_`). */
function emphasis(escaped: string): string {
    return escaped
        .replace(/\*\*(?=\S)(.+?)\*\*/g, "<strong>$1</strong>")
        .replace(/\*(?=\S)(.+?)\*/g, "<em>$1</em>")
        .replace(/(^|\W)_(?=\S)(.+?)_(?=\W|$)/g, "$1<em>$2</em>");
}

/** One line of text: inline code is taken as it is, the rest gets emphasis. */
function inline(text: string): string {
    return text
        .split(/(`[^`]+`)/)
        .map((part, index) =>
            index % 2 === 1
                ? `<code>${escapeHtml(part.slice(1, -1))}</code>`
                : emphasis(escapeHtml(part)),
        )
        .join("");
}

const HEADING = /^(#{1,6})\s+(.*)$/;
const BULLET = /^\s*[-*+]\s+(.*)$/;
const NUMBERED = /^\s*\d+[.)]\s+(.*)$/;
const FENCE = /^\s*```/;

/** The source as HTML. */
export function renderMarkdown(source: string): string {
    const lines = source.replaceAll("\r\n", "\n").split("\n");
    const html: string[] = [];
    let paragraph: string[] = [];
    let list: { tag: "ul" | "ol"; items: string[] } | undefined;

    function closeParagraph() {
        if (paragraph.length > 0) {
            html.push(`<p>${inline(paragraph.join(" "))}</p>`);
            paragraph = [];
        }
    }
    function closeList() {
        if (list) {
            const items = list.items.map((item) => `<li>${inline(item)}</li>`);
            html.push(`<${list.tag}>${items.join("")}</${list.tag}>`);
            list = undefined;
        }
    }
    function addItem(tag: "ul" | "ol", item: string) {
        closeParagraph();
        if (list?.tag !== tag) closeList();
        list ??= { tag, items: [] };
        list.items.push(item);
    }

    for (let index = 0; index < lines.length; index++) {
        const line = lines[index] ?? "";
        if (FENCE.test(line)) {
            closeParagraph();
            closeList();
            const code: string[] = [];
            index++;
            while (index < lines.length && !FENCE.test(lines[index] ?? "")) {
                code.push(lines[index] ?? "");
                index++;
            }
            html.push(`<pre><code>${escapeHtml(code.join("\n"))}</code></pre>`);
            continue;
        }
        const heading = HEADING.exec(line);
        const bullet = BULLET.exec(line);
        const numbered = NUMBERED.exec(line);
        if (heading) {
            closeParagraph();
            closeList();
            const level = heading[1]?.length ?? 1;
            html.push(`<h${level}>${inline(heading[2] ?? "")}</h${level}>`);
        } else if (bullet) {
            addItem("ul", bullet[1] ?? "");
        } else if (numbered) {
            addItem("ol", numbered[1] ?? "");
        } else if (line.trim() === "") {
            closeParagraph();
            closeList();
        } else {
            closeList();
            paragraph.push(line.trim());
        }
    }
    closeParagraph();
    closeList();
    return html.join("\n");
}
