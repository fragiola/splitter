import { flushPromises } from "@vue/test-utils";
import { afterEach, describe, expect, it, vi } from "vitest";
import { type App, createSSRApp, defineComponent, h } from "vue";
import { renderToString } from "vue/server-renderer";
import {
    createSplitterModel,
    Splitter,
    type SplitterJson,
    type SplitterModel,
} from "../src";

// Server rendering (D6): panels are flex items whose grow factor is their size, written from the
// first render, so the server HTML has the sizes and hydrating it changes nothing.

interface AppProps {
    model?: SplitterModel;
    defaultLayout?: Record<string, number>;
}

function app(props: AppProps): App {
    return createSSRApp(
        defineComponent({
            setup: () => () =>
                h(
                    Splitter.Group,
                    {
                        id: "g",
                        model: props.model,
                        defaultLayout: props.defaultLayout,
                    },
                    () => [
                        h(Splitter.Panel, { id: "a", defaultSize: "20%" }),
                        h(Splitter.Separator, { "aria-label": "Resize" }),
                        h(Splitter.Panel, { id: "b" }, () => [
                            h(
                                Splitter.Group,
                                { id: "inner", orientation: "vertical" },
                                () => [
                                    h(Splitter.Panel, { id: "x" }),
                                    h(Splitter.Separator, {
                                        "aria-label": "Resize",
                                    }),
                                    h(Splitter.Panel, { id: "y" }),
                                ],
                            ),
                        ]),
                    ],
                ),
        }),
    );
}

/** Each panel's inline flex, in document order. */
function flexes(root: ParentNode): string[] {
    return [
        ...root.querySelectorAll<HTMLElement>('[data-splitter-part="panel"]'),
    ].map(
        (panel) =>
            `${panel.style.flexGrow} ${panel.style.flexShrink} ${panel.style.flexBasis}`,
    );
}

function parse(html: string): HTMLElement {
    const container = document.createElement("div");
    container.innerHTML = html;
    return container;
}

const mounted: App[] = [];

/**
 * Hydrates the server HTML and collects what Vue reports: a first client render that differs from
 * the server's HTML (an attribute, a style) is a hydration mismatch.
 */
async function hydrate(html: string, props: AppProps) {
    const container = parse(html);
    document.body.append(container);
    const errors: unknown[] = [];
    const report = (...args: unknown[]) => {
        errors.push(args);
    };
    const warn = vi.spyOn(console, "warn").mockImplementation(report);
    const error = vi.spyOn(console, "error").mockImplementation(report);
    const client = app(props);
    client.mount(container);
    mounted.push(client);
    await flushPromises();
    warn.mockRestore();
    error.mockRestore();
    return { container, errors };
}

afterEach(() => {
    for (const each of mounted.splice(0)) each.unmount();
});

describe("server rendering", () => {
    it("writes the given layout's flex sizes, and hydrating keeps them", async () => {
        const html = await renderToString(
            app({ defaultLayout: { a: 30, b: 70 } }),
        );
        const server = flexes(parse(html));
        expect(server.slice(0, 2)).toEqual(["30 1 0px", "70 1 0px"]);
        const { container, errors } = await hydrate(html, {
            defaultLayout: { a: 30, b: 70 },
        });
        // the first client render is the server's: nothing to report
        expect(errors).toEqual([]);
        // once registered, the model's sizes are the same
        expect(flexes(container)).toEqual([
            "30 1 0px",
            "70 1 0px",
            "50 1 0px",
            "50 1 0px",
        ]);
    });

    it("writes a saved layout from the model's document", async () => {
        const json: SplitterJson = {
            version: 1,
            groups: [
                {
                    id: "g",
                    panels: [
                        { id: "a", size: 40 },
                        { id: "b", size: 60 },
                    ],
                },
                {
                    id: "inner",
                    panels: [
                        { id: "x", size: 10 },
                        { id: "y", size: 90 },
                    ],
                },
            ],
        };
        const html = await renderToString(
            app({ model: createSplitterModel(json) }),
        );
        expect(flexes(parse(html))).toEqual([
            "40 1 0px",
            "60 1 0px",
            "10 1 0px",
            "90 1 0px",
        ]);
        const { container, errors } = await hydrate(html, {
            model: createSplitterModel(json),
        });
        expect(errors).toEqual([]);
        expect(flexes(container)).toEqual(flexes(parse(html)));
    });

    it("without a layout, gives a default size as the flex basis and shares the rest", async () => {
        const html = await renderToString(app({}));
        expect(flexes(parse(html))).toEqual([
            "0 1 20%",
            "1 1 0px",
            "1 1 0px",
            "1 1 0px",
        ]);
        const { container, errors } = await hydrate(html, {});
        expect(errors).toEqual([]);
        expect(flexes(container)).toEqual([
            "20 1 0px",
            "80 1 0px",
            "50 1 0px",
            "50 1 0px",
        ]);
    });

    it("would report a first client render with other flex sizes (the check above works)", async () => {
        const html = await renderToString(
            app({ defaultLayout: { a: 30, b: 70 } }),
        );
        const { errors } = await hydrate(html, {
            defaultLayout: { a: 40, b: 60 },
        });
        expect(errors).not.toEqual([]);
    });

    it("writes the structure and state attributes on the server, and no text", async () => {
        const html = await renderToString(
            app({ defaultLayout: { a: 30, b: 70 } }),
        );
        const root = parse(html);
        expect(root.textContent).toBe("");
        expect(
            [...root.querySelectorAll<HTMLElement>("[data-splitter-part]")].map(
                (element) => element.dataset.splitterPart,
            ),
        ).toEqual([
            "group",
            "panel",
            "separator",
            "panel",
            "group",
            "panel",
            "separator",
            "panel",
        ]);
        expect(html).not.toContain('="false"');
        const separator = root.querySelector('[role="separator"]');
        expect(separator?.getAttribute("tabindex")).toBe("0");
    });
});
