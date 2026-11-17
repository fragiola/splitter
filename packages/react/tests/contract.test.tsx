import { act, render, screen } from "@testing-library/react";
import * as React from "react";
import { describe, expect, it, vi } from "vitest";
import {
    type GroupPartState,
    type PanelPartState,
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
import { at, press } from "./helpers";

// The primitive contract (guidelines components/primitives.md, AGENTS.md rule 14): what every part
// of Splitter does with render, ref, props, handlers, className, style, data-* and names.

function TwoPanels(props: {
    group?: Partial<React.ComponentProps<typeof Splitter.Group>>;
    panel?: Partial<React.ComponentProps<typeof Splitter.Panel>>;
    separator?: Partial<React.ComponentProps<typeof Splitter.Separator>>;
}) {
    return (
        <Splitter.Group id="g" {...props.group}>
            <Splitter.Panel id="a" {...props.panel} />
            <Splitter.Separator {...props.separator} />
            <Splitter.Panel id="b" />
        </Splitter.Group>
    );
}

const ALL = ["/g0", "/g0/p0", "/g0/s0", "/g0/p1"];

describe("render", () => {
    it("replaces each part's element with an element, its props merged", () => {
        const { container } = render(
            <TwoPanels
                group={{ render: <section data-own="group" /> }}
                panel={{ render: <article data-own="panel" /> }}
                separator={{ render: <hr data-own="separator" /> }}
            />,
        );
        expect(at(container, "/g0").tagName).toBe("SECTION");
        expect(at(container, "/g0").dataset.own).toBe("group");
        expect(at(container, "/g0/p0").tagName).toBe("ARTICLE");
        expect(at(container, "/g0/s0").tagName).toBe("HR");
        expect(at(container, "/g0/s0").getAttribute("role")).toBe("separator");
        expect(at(container, "/g0/p0").style.flexGrow).toBe("50");
    });

    it("replaces each part's element with a function of its props and state", () => {
        const seen: unknown[] = [];
        const { container } = render(
            <TwoPanels
                group={{
                    render: (props, state) => {
                        seen.push(state);
                        return <main {...props} />;
                    },
                }}
                panel={{
                    render: (props, state) => (
                        <aside {...props} data-size={String(state.size)} />
                    ),
                }}
                separator={{
                    render: (props, state) => (
                        <span {...props} data-id={state.id ?? "none"} />
                    ),
                }}
            />,
        );
        expect(at(container, "/g0").tagName).toBe("MAIN");
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

describe("ref", () => {
    it("is a plain prop on each part, merged with the part's own", () => {
        const group = React.createRef<HTMLElement>();
        const panel = vi.fn();
        const separator = React.createRef<HTMLElement>();
        const { container } = render(
            <TwoPanels
                group={{ ref: group }}
                panel={{ ref: panel }}
                separator={{ ref: separator }}
            />,
        );
        expect(group.current).toBe(at(container, "/g0"));
        expect(panel).toHaveBeenCalledWith(at(container, "/g0/p0"));
        expect(separator.current).toBe(at(container, "/g0/s0"));
        // the part's own ref still binds: the separator answers the keyboard
        press(at(container, "/g0/s0"), "ArrowRight");
        expect(at(container, "/g0/p0").style.flexGrow).toBe("55");
    });
});

describe("props and handlers", () => {
    it("forwards arbitrary props", () => {
        render(
            <TwoPanels
                group={{ title: "group", "aria-describedby": "help" }}
                panel={{ tabIndex: -1, lang: "pt" }}
                separator={{ "aria-label": "Resize", title: "sep" }}
            />,
        );
        expect(screen.getByTitle("group")).toHaveAttribute(
            "aria-describedby",
            "help",
        );
        expect(document.getElementById("a")).toHaveAttribute("lang", "pt");
        expect(
            screen.getByRole("separator", { name: "Resize" }),
        ).toHaveAttribute("title", "sep");
    });

    it("composes the consumer's handlers after the part's own", () => {
        const order: string[] = [];
        const onKeyDown = vi.fn((event: React.KeyboardEvent<HTMLElement>) => {
            // the separator already moved, and marked the key as handled
            order.push("consumer");
            expect(event.defaultPrevented).toBe(true);
        });
        const { container } = render(
            <TwoPanels
                group={{
                    onLayoutChange: (layout) =>
                        order.push(`layout:${layout.a}`),
                }}
                separator={{ onKeyDown }}
            />,
        );
        order.length = 0;
        act(() => press(at(container, "/g0/s0"), "ArrowRight"));
        expect(onKeyDown).toHaveBeenCalledTimes(1);
        expect(order).toEqual(["layout:55", "consumer"]);
    });
});

describe("className and style", () => {
    it("take a value", () => {
        const { container } = render(
            <TwoPanels
                group={{ className: "g", style: { color: "red" } }}
                panel={{ className: "p", style: { padding: 4 } }}
                separator={{ className: "s", style: { width: 4 } }}
            />,
        );
        expect(at(container, "/g0")).toHaveClass("g");
        expect(at(container, "/g0").style.color).toBe("red");
        expect(at(container, "/g0/p0")).toHaveClass("p");
        expect(at(container, "/g0/p0").style.padding).toBe("4px");
        expect(at(container, "/g0/s0")).toHaveClass("s");
        expect(at(container, "/g0/s0").style.width).toBe("4px");
    });

    it("take a function of the part's state", () => {
        const { container } = render(
            <TwoPanels
                group={{
                    className: (state) => `g-${state.orientation}`,
                    style: (state) => ({ gap: state.disabled ? 0 : 2 }),
                }}
                panel={{
                    collapsible: true,
                    className: (state: PanelPartState) =>
                        state.collapsible ? "can-collapse" : undefined,
                    style: (state: PanelPartState) => ({
                        opacity: state.collapsed ? 0.5 : 1,
                    }),
                }}
                separator={{
                    className: (state) => `s-${state.orientation}`,
                }}
            />,
        );
        expect(at(container, "/g0")).toHaveClass("g-horizontal");
        expect(at(container, "/g0").style.gap).toBe("2px");
        expect(at(container, "/g0/p0")).toHaveClass("can-collapse");
        expect(at(container, "/g0/p0").style.opacity).toBe("1");
        expect(at(container, "/g0/s0")).toHaveClass("s-vertical");
    });

    it("never override the structural style", () => {
        const { container } = render(
            <TwoPanels
                group={{ style: { display: "block", flexDirection: "column" } }}
                panel={{ style: { flexGrow: 3, overflow: "auto" } }}
                separator={{ style: { flexShrink: 1 } }}
            />,
        );
        expect(at(container, "/g0").style.display).toBe("flex");
        expect(at(container, "/g0").style.flexDirection).toBe("row");
        expect(at(container, "/g0/p0").style.flexGrow).toBe("50");
        expect(at(container, "/g0/p0").style.overflow).toBe("hidden");
        expect(at(container, "/g0/s0").style.flexShrink).toBe("0");
    });
});

describe("inline style is structural only", () => {
    it("sets flex sizing, overflow on panels and touch-action on separators, nothing cosmetic", () => {
        const { container } = render(<TwoPanels />);
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

    it("stacks a vertical group", () => {
        const { container } = render(
            <TwoPanels group={{ orientation: "vertical" }} />,
        );
        expect(at(container, "/g0").style.flexDirection).toBe("column");
        expect(at(container, "/g0/s0")).toHaveAttribute(
            "aria-orientation",
            "horizontal",
        );
    });
});

describe("data-* attributes", () => {
    it('are present or absent, never "false"', () => {
        const { container, rerender } = render(<TwoPanels />);
        const values = () =>
            [...container.querySelectorAll("*")].flatMap((element) =>
                [...element.attributes]
                    .filter(({ name }) => name.startsWith("data-"))
                    .map(({ value }) => value),
            );
        expect(values()).not.toContain("false");
        expect(at(container, "/g0")).not.toHaveAttribute("data-disabled");
        expect(at(container, "/g0/p0")).not.toHaveAttribute("data-collapsed");
        rerender(
            <TwoPanels
                group={{ disabled: true }}
                panel={{ collapsible: true, disabled: true }}
            />,
        );
        expect(values()).not.toContain("false");
        expect(at(container, "/g0")).toHaveAttribute("data-disabled", "");
        expect(at(container, "/g0/p0")).toHaveAttribute("data-collapsible", "");
        expect(at(container, "/g0/p0")).toHaveAttribute("data-disabled", "");
        expect(at(container, "/g0/s0")).toHaveAttribute("data-disabled", "");
    });

    it("name the part and its path on every element", () => {
        const { container } = render(<TwoPanels />);
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
    it("render no text and no name of their own", () => {
        const { container } = render(<TwoPanels />);
        expect(container.textContent).toBe("");
        expect(container.querySelector("[aria-label]")).toBeNull();
        expect(container.querySelector("[aria-labelledby]")).toBeNull();
    });

    it("render only the consumer's children", () => {
        render(
            <Splitter.Group>
                <Splitter.Panel>left</Splitter.Panel>
                <Splitter.Separator>
                    <span>grip</span>
                </Splitter.Separator>
                <Splitter.Panel>right</Splitter.Panel>
            </Splitter.Group>,
        );
        expect(screen.getByText("left")).toHaveAttribute(
            "data-splitter-part",
            "panel",
        );
        expect(screen.getByText("grip").parentElement).toHaveAttribute(
            "role",
            "separator",
        );
    });
});

describe("the separator's ARIA (Window Splitter)", () => {
    it("comes from the engine, with tabIndex 0 unless disabled", () => {
        const { container, rerender } = render(<TwoPanels />);
        const separator = at(container, "/g0/s0");
        expect(separator).toHaveAttribute("role", "separator");
        expect(separator).toHaveAttribute("aria-orientation", "vertical");
        expect(separator).toHaveAttribute("aria-valuenow", "50");
        expect(separator).toHaveAttribute("aria-valuemin", "0");
        expect(separator).toHaveAttribute("aria-valuemax", "100");
        expect(separator).toHaveAttribute("aria-controls", "a");
        expect(separator).toHaveAttribute("tabindex", "0");
        rerender(<TwoPanels separator={{ disabled: true }} />);
        expect(separator).not.toHaveAttribute("tabindex");
        expect(separator).toHaveAttribute("aria-disabled", "true");
    });
});

describe("hooks have one shape", () => {
    it("useSplitter returns { model, engine, groupId }; each part hook { state, props }", () => {
        let splitter: SplitterContextValue | undefined;
        let group: UseGroupResult | undefined;
        let panel: UsePanelResult | undefined;
        let separator: UseSeparatorResult | undefined;
        function Probe() {
            splitter = useSplitter();
            group = useGroup();
            return null;
        }
        function MyPanel(props: { id: string }) {
            const result = usePanel({ id: props.id });
            if (props.id === "a") panel = result;
            const { ref, ...rest } = result.props;
            return <div ref={ref} {...rest} />;
        }
        function MySeparator() {
            separator = useSeparator();
            return <div {...separator.props} />;
        }
        const { container } = render(
            <Splitter.Group id="g">
                <Probe />
                <MyPanel id="a" />
                <MySeparator />
                <MyPanel id="b" />
            </Splitter.Group>,
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
        expect(panel?.state).toMatchObject({ id: "a", size: 50 });
        expect(separator?.state).toMatchObject({ id: "a:b", path: "/g0/s0" });
        expect(at(container, "/g0/s0")).toHaveAttribute("aria-controls", "a");
    });

    it("useSplitter throws outside a group", () => {
        const error = vi.spyOn(console, "error").mockImplementation(() => {});
        function Outside() {
            useSplitter();
            return null;
        }
        expect(() => render(<Outside />)).toThrow(/inside Splitter.Group/);
        error.mockRestore();
    });
});

it("every part of the namespace is listed", () => {
    expect(Object.keys(Splitter).sort()).toEqual([
        "Group",
        "Panel",
        "Separator",
    ]);
});
