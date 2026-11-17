import { describe, expect, it, vi } from "vitest";
import {
    defineComponent,
    h,
    type Slots,
    shallowRef,
    type VNodeChild,
} from "vue";
import {
    type GroupPartState,
    type PanelPartState,
    type SeparatorPartState,
    Splitter,
    type SplitterContextValue,
    type UseGroupResult,
    type UsePanelResult,
    type UseSeparatorResult,
    useGroup,
    usePanel,
    useSeparator,
    useSplitter,
} from "../src";
import { at, mountApp, press, render, settle } from "./helpers";

// The primitive contract (guidelines components/primitives.md, AGENTS.md rule 14), in Vue: what
// every part of Splitter does with `as`, the `render` slot, template refs, attributes, listeners,
// class, style, data-* and names.

type Attrs = Record<string, unknown>;

function twoPanels(
    props: {
        group?: Attrs;
        panel?: Attrs;
        separator?: Attrs;
        groupSlots?: Slots | Record<string, unknown>;
        panelSlots?: Record<string, unknown>;
        separatorSlots?: Record<string, unknown>;
    } = {},
): VNodeChild {
    return h(
        Splitter.Group,
        { id: "g", ...props.group },
        {
            ...props.groupSlots,
            default: () => [
                h(
                    Splitter.Panel,
                    { id: "a", ...props.panel },
                    props.panelSlots,
                ),
                h(Splitter.Separator, props.separator, props.separatorSlots),
                h(Splitter.Panel, { id: "b" }),
            ],
        },
    );
}

const ALL = ["/g0", "/g0/p0", "/g0/s0", "/g0/p1"];

describe("as", () => {
    it("replaces each part's element with another tag, its attributes merged", async () => {
        const { container } = await render(() =>
            twoPanels({
                group: { as: "section", "data-own": "group" },
                panel: { as: "article" },
                separator: { as: "hr" },
            }),
        );
        expect(at(container, "/g0").tagName).toBe("SECTION");
        expect(at(container, "/g0").dataset.own).toBe("group");
        expect(at(container, "/g0/p0").tagName).toBe("ARTICLE");
        expect(at(container, "/g0/s0").tagName).toBe("HR");
        expect(at(container, "/g0/s0").getAttribute("role")).toBe("separator");
        expect(at(container, "/g0/p0").style.flexGrow).toBe("50");
    });

    it("renders a component instead, with the part's props", async () => {
        const Section = defineComponent({
            inheritAttrs: false,
            setup(_, { attrs, slots }) {
                return () =>
                    h(
                        "section",
                        { ...attrs, "data-own": "" },
                        slots.default?.(),
                    );
            },
        });
        const { container } = await render(() =>
            twoPanels({ panel: { as: Section } }),
        );
        expect(at(container, "/g0/p0").tagName).toBe("SECTION");
        expect(at(container, "/g0/p0")).toHaveAttribute("data-own", "");
    });
});

describe("the render slot", () => {
    it("replaces each part's element, given its props, state and children", async () => {
        const seen: unknown[] = [];
        const { container } = await render(() =>
            twoPanels({
                groupSlots: {
                    render: ({
                        props,
                        state,
                        children,
                    }: {
                        props: Attrs;
                        state: GroupPartState;
                        children: VNodeChild;
                    }) => {
                        seen.push(state);
                        return [h("main", props, [children])];
                    },
                },
                panelSlots: {
                    render: ({
                        props,
                        state,
                    }: {
                        props: Attrs;
                        state: PanelPartState;
                    }) => [
                        h("aside", {
                            ...props,
                            "data-size": String(state.size),
                        }),
                    ],
                },
                separatorSlots: {
                    render: ({
                        props,
                        state,
                    }: {
                        props: Attrs;
                        state: SeparatorPartState;
                    }) => [
                        h("span", { ...props, "data-id": state.id ?? "none" }),
                    ],
                },
            }),
        );
        expect(at(container, "/g0").tagName).toBe("MAIN");
        expect(at(container, "/g0/p0").tagName).toBe("ASIDE");
        expect(at(container, "/g0/p0").dataset.size).toBe("50");
        expect(at(container, "/g0/s0").dataset.id).toBe("a:b");
        expect(seen.at(-1)).toEqual({
            id: "g",
            orientation: "horizontal",
            disabled: false,
            dragging: false,
            path: "/g0",
        } satisfies GroupPartState);
    });
});

describe("template refs", () => {
    it("reach each part's component, whose $el is its element, and the part's own still binds", async () => {
        const group = shallowRef<{ $el: unknown } | null>(null);
        const panel = vi.fn();
        const { container } = await render(() =>
            twoPanels({
                group: { ref: group },
                panel: { ref: panel },
            }),
        );
        expect(group.value?.$el).toBe(at(container, "/g0"));
        expect(panel.mock.calls.at(-1)?.[0].$el).toBe(at(container, "/g0/p0"));
        // the part's own ref still binds: the separator answers the keyboard
        await press(at(container, "/g0/s0"), "ArrowRight");
        expect(at(container, "/g0/p0").style.flexGrow).toBe("55");
    });
});

describe("attributes and listeners", () => {
    it("forwards arbitrary attributes", async () => {
        const { container } = await render(() =>
            twoPanels({
                group: { title: "group", "aria-describedby": "help" },
                panel: { tabindex: -1, lang: "pt" },
                separator: { "aria-label": "Resize", title: "sep" },
            }),
        );
        expect(at(container, "/g0")).toHaveAttribute("title", "group");
        expect(at(container, "/g0")).toHaveAttribute(
            "aria-describedby",
            "help",
        );
        expect(document.getElementById("a")).toHaveAttribute("lang", "pt");
        expect(at(container, "/g0/s0")).toHaveAttribute("aria-label", "Resize");
        expect(at(container, "/g0/s0")).toHaveAttribute("title", "sep");
    });

    it("runs the consumer's listeners after the part's own", async () => {
        const order: string[] = [];
        const onKeydown = vi.fn((event: KeyboardEvent) => {
            // the separator already moved, and marked the key as handled
            order.push("consumer");
            expect(event.defaultPrevented).toBe(true);
        });
        const { container } = await render(() =>
            twoPanels({
                group: {
                    onLayoutChange: (layout: Record<string, number>) =>
                        order.push(`layout:${layout.a}`),
                },
                separator: { onKeydown },
            }),
        );
        order.length = 0;
        await press(at(container, "/g0/s0"), "ArrowRight");
        expect(onKeydown).toHaveBeenCalledTimes(1);
        expect(order).toEqual(["layout:55", "consumer"]);
    });

    it("keeps that order for a separator added later, and with the render slot", async () => {
        const shown = shallowRef(false);
        const onKeydown = vi.fn((event: KeyboardEvent) => {
            expect(event.defaultPrevented).toBe(true);
        });
        const { container } = await render(() =>
            h(Splitter.Group, { id: "g" }, () => [
                h(Splitter.Panel, { id: "a" }),
                ...(shown.value
                    ? [
                          h(
                              Splitter.Separator,
                              { onKeydown },
                              {
                                  render: ({ props }: { props: Attrs }) => [
                                      h("span", props),
                                  ],
                              },
                          ),
                          h(Splitter.Panel, { id: "b" }),
                      ]
                    : []),
            ]),
        );
        shown.value = true;
        await settle();
        await press(at(container, "/g0/s0"), "ArrowRight");
        expect(onKeydown).toHaveBeenCalledTimes(1);
        expect(at(container, "/g0/p0").style.flexGrow).toBe("55");
    });
});

describe("class and style", () => {
    it("are merged onto each part's element", async () => {
        const { container } = await render(() =>
            twoPanels({
                group: { class: "g", style: { color: "red" } },
                panel: { class: ["p", { on: true }], style: "padding: 4px" },
                separator: { class: "s", style: { width: "4px" } },
            }),
        );
        expect(at(container, "/g0")).toHaveClass("g");
        expect(at(container, "/g0").style.color).toBe("red");
        expect(at(container, "/g0/p0")).toHaveClass("p", "on");
        expect(at(container, "/g0/p0").style.padding).toBe("4px");
        expect(at(container, "/g0/s0")).toHaveClass("s");
        expect(at(container, "/g0/s0").style.width).toBe("4px");
    });

    it("never override the structural style", async () => {
        const { container } = await render(() =>
            twoPanels({
                group: {
                    style: { display: "block", flexDirection: "column" },
                },
                panel: { style: "flex-grow: 3; overflow: auto" },
                separator: { style: { flexShrink: 1 } },
            }),
        );
        expect(at(container, "/g0").style.display).toBe("flex");
        expect(at(container, "/g0").style.flexDirection).toBe("row");
        expect(at(container, "/g0/p0").style.flexGrow).toBe("50");
        expect(at(container, "/g0/p0").style.overflow).toBe("hidden");
        expect(at(container, "/g0/s0").style.flexShrink).toBe("0");
    });
});

describe("inline style is structural only", () => {
    it("sets flex sizing, overflow on panels and touch-action on separators, nothing cosmetic", async () => {
        const { container } = await render(() => twoPanels());
        const keys = (element: HTMLElement) =>
            // (jsdom also lists the shorthand of the flex longhands)
            [...element.style].filter((key) => key !== "flex").sort();
        expect(keys(at(container, "/g0"))).toEqual(
            ["display", "flex-direction", "flex-wrap"].sort(),
        );
        expect(keys(at(container, "/g0/p0"))).toEqual(
            ["flex-basis", "flex-grow", "flex-shrink", "overflow"].sort(),
        );
        expect(keys(at(container, "/g0/s0"))).toEqual(
            ["flex-grow", "flex-shrink", "touch-action"].sort(),
        );
    });

    it("stacks a vertical group", async () => {
        const { container } = await render(() =>
            twoPanels({ group: { orientation: "vertical" } }),
        );
        expect(at(container, "/g0").style.flexDirection).toBe("column");
        expect(at(container, "/g0/s0")).toHaveAttribute(
            "aria-orientation",
            "horizontal",
        );
    });
});

describe("data-* attributes", () => {
    it('are present or absent, never "false"', async () => {
        const on = shallowRef(false);
        const { container } = await render(() =>
            twoPanels({
                group: { disabled: on.value },
                panel: { collapsible: on.value, disabled: on.value },
            }),
        );
        const values = () =>
            [...container.querySelectorAll("*")].flatMap((element) =>
                [...element.attributes]
                    .filter(({ name }) => name.startsWith("data-"))
                    .map(({ value }) => value),
            );
        expect(values()).not.toContain("false");
        expect(at(container, "/g0")).not.toHaveAttribute("data-disabled");
        expect(at(container, "/g0/p0")).not.toHaveAttribute("data-collapsed");
        on.value = true;
        await settle();
        expect(values()).not.toContain("false");
        expect(at(container, "/g0")).toHaveAttribute("data-disabled", "");
        expect(at(container, "/g0/p0")).toHaveAttribute("data-collapsible", "");
        expect(at(container, "/g0/p0")).toHaveAttribute("data-disabled", "");
        expect(at(container, "/g0/s0")).toHaveAttribute("data-disabled", "");
    });

    it("take a bare boolean attribute as true", async () => {
        const { container } = await render(() =>
            twoPanels({
                group: { disabled: "" },
                panel: { collapsible: "" },
            }),
        );
        expect(at(container, "/g0")).toHaveAttribute("data-disabled", "");
        expect(at(container, "/g0/p0")).toHaveAttribute("data-collapsible", "");
    });

    it("name the part and its path on every element", async () => {
        const { container } = await render(() => twoPanels());
        const all = [...container.querySelectorAll<HTMLElement>("*")];
        expect(all.map((element) => element.dataset.splitterPath)).toEqual(ALL);
        expect(all.map((element) => element.dataset.splitterPart)).toEqual([
            "group",
            "panel",
            "separator",
            "panel",
        ]);
        expect(at(container, "/g0")).toHaveAttribute(
            "data-orientation",
            "horizontal",
        );
        expect(at(container, "/g0/s0")).toHaveAttribute(
            "data-orientation",
            "vertical",
        );
    });
});

describe("names and text", () => {
    it("render no text and no name of their own", async () => {
        const { container } = await render(() => twoPanels());
        expect(container.textContent).toBe("");
        expect(container.querySelector("[aria-label]")).toBeNull();
        expect(container.querySelector("[aria-labelledby]")).toBeNull();
    });

    it("render only the consumer's children", async () => {
        const { container } = await render(() =>
            h(Splitter.Group, null, () => [
                h(Splitter.Panel, null, () => "left"),
                h(Splitter.Separator, null, () => [h("span", "grip")]),
                h(Splitter.Panel, null, () => "right"),
            ]),
        );
        expect(at(container, "/g0/p0").textContent).toBe("left");
        expect(at(container, "/g0/s0").querySelector("span")?.textContent).toBe(
            "grip",
        );
    });

    it("give the default slots the part's state", async () => {
        const { container } = await render(() =>
            h(Splitter.Group, { id: "g" }, () => [
                h(
                    Splitter.Panel,
                    { id: "a" },
                    {
                        default: ({ state }: { state: PanelPartState }) =>
                            `${state.id}:${state.size}`,
                    },
                ),
                h(Splitter.Separator),
                h(Splitter.Panel, { id: "b" }),
            ]),
        );
        expect(at(container, "/g0/p0").textContent).toBe("a:50");
    });
});

describe("the separator's ARIA (Window Splitter)", () => {
    it("comes from the engine, with tabindex 0 unless disabled", async () => {
        const disabled = shallowRef<boolean | undefined>(undefined);
        const { container } = await render(() =>
            twoPanels({ separator: { disabled: disabled.value } }),
        );
        const separator = at(container, "/g0/s0");
        expect(separator).toHaveAttribute("role", "separator");
        expect(separator).toHaveAttribute("aria-orientation", "vertical");
        expect(separator).toHaveAttribute("aria-valuenow", "50");
        expect(separator).toHaveAttribute("aria-valuemin", "0");
        expect(separator).toHaveAttribute("aria-valuemax", "100");
        expect(separator).toHaveAttribute("aria-controls", "a");
        expect(separator).toHaveAttribute("tabindex", "0");
        disabled.value = true;
        await settle();
        expect(separator).not.toHaveAttribute("tabindex");
        expect(separator).toHaveAttribute("aria-disabled", "true");
    });
});

describe("composables have one shape", () => {
    it("useSplitter returns { model, engine, groupId }; each part composable { state, props }", async () => {
        let splitter: SplitterContextValue | undefined;
        let group: UseGroupResult | undefined;
        let panel: UsePanelResult | undefined;
        let separator: UseSeparatorResult | undefined;
        const Probe = defineComponent({
            setup() {
                splitter = useSplitter();
                group = useGroup();
                return () => null;
            },
        });
        const MyPanel = defineComponent({
            props: { id: { type: String, required: true } },
            setup(props) {
                const result = usePanel(() => ({ id: props.id }));
                if (props.id === "a") panel = result;
                return () => h("div", result.props.value);
            },
        });
        const MySeparator = defineComponent({
            setup() {
                const result = useSeparator();
                separator = result;
                return () => h("div", result.props.value);
            },
        });
        const { container } = await render(() =>
            h(Splitter.Group, { id: "g" }, () => [
                h(Probe),
                h(MyPanel, { id: "a" }),
                h(MySeparator),
                h(MyPanel, { id: "b" }),
            ]),
        );
        expect(Object.keys(splitter ?? {}).sort()).toEqual([
            "engine",
            "groupId",
            "model",
        ]);
        expect(splitter?.groupId).toBe("g");
        expect(splitter?.model.get("layout-by", { groupId: "g" })).toEqual({
            a: 50,
            b: 50,
        });
        for (const result of [group, panel, separator]) {
            expect(Object.keys(result ?? {}).sort()).toEqual([
                "props",
                "state",
            ]);
        }
        expect(panel?.state.value).toMatchObject({ id: "a", size: 50 });
        expect(separator?.state.value).toMatchObject({
            id: "a:b",
            path: "/g0/s0",
        });
        expect(at(container, "/g0/s0")).toHaveAttribute("aria-controls", "a");
    });

    it("useSplitter throws outside a group", async () => {
        vi.spyOn(console, "warn").mockImplementation(() => {});
        const Outside = defineComponent({
            setup() {
                useSplitter();
                return () => null;
            },
        });
        await expect(mountApp(Outside)).rejects.toThrow(
            /inside Splitter.Group/,
        );
    });
});

it("every part of the namespace is listed", () => {
    expect(Object.keys(Splitter).sort()).toEqual([
        "Group",
        "Panel",
        "Separator",
    ]);
});
