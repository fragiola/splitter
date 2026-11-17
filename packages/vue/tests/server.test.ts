// @vitest-environment node
import { describe, expect, it } from "vitest";
import { createSSRApp, h } from "vue";
import { renderToString } from "vue/server-renderer";
import { createSplitterRef, Splitter } from "../src";

// Without a document (D6): a server renders the parts and their sizes, with no DOM to reach.

describe("server rendering without a document", () => {
    it("renders the parts, their sizes and their ARIA role", async () => {
        expect(typeof document).toBe("undefined");
        const splitterRef = createSplitterRef();
        const html = await renderToString(
            createSSRApp({
                setup: () => () =>
                    h(
                        Splitter.Group,
                        {
                            id: "g",
                            splitterRef,
                            defaultLayout: { a: 25, b: 75 },
                        },
                        () => [
                            h(Splitter.Panel, { id: "a" }, () => "left"),
                            h(Splitter.Separator, { "aria-label": "Resize" }),
                            h(Splitter.Panel, { id: "b" }, () => "right"),
                        ],
                    ),
            }),
        );
        expect(html).toContain('data-splitter-part="group"');
        expect(html).toContain("flex-grow:25;");
        expect(html).toContain("flex-grow:75;");
        expect(html).toContain('role="separator"');
        expect(html).toContain(">left<");
        // nothing is registered on the server: no path, and no handle in the ref
        expect(html).not.toContain("data-splitter-path");
        expect(splitterRef.current).toBeNull();
    });
});
