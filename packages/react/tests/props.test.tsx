import { act, render } from "@testing-library/react";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import {
    type CommandEvent,
    createSplitterModel,
    type Layout,
    Splitter,
    type SplitterModel,
} from "../src";
import { at, grows, press } from "./helpers";

// Props map onto commands: what a group, a panel and a separator declare reaches the model, and
// a change of a prop is one command.

function commandsOf(model: SplitterModel) {
    const events: CommandEvent[] = [];
    model.subscribe((event) => events.push(event));
    return () =>
        events.splice(0).map(({ command, payload }) => ({ command, payload }));
}

describe("the group's layout", () => {
    it("is controlled with layout and onLayoutChange", () => {
        let setLayout: (layout: Layout) => void = () => {};
        function Controlled() {
            const [layout, set] = useState<Layout>({ a: 30, b: 70 });
            setLayout = set;
            return (
                <Splitter.Group
                    id="g"
                    layout={layout}
                    onLayoutChange={(next) => set({ ...next })}
                >
                    <Splitter.Panel id="a" />
                    <Splitter.Separator />
                    <Splitter.Panel id="b" />
                </Splitter.Group>
            );
        }
        const { container } = render(<Controlled />);
        expect(grows(container)).toEqual([30, 70]);
        act(() => setLayout({ a: 60, b: 40 }));
        expect(grows(container)).toEqual([60, 40]);
        act(() => press(at(container, "/g0/s0"), "ArrowRight"));
        expect(grows(container)).toEqual([65, 35]);
    });

    it("starts from defaultLayout unless the model saved one", () => {
        function App(props: { model: SplitterModel }) {
            return (
                <Splitter.Group
                    id="g"
                    model={props.model}
                    defaultLayout={{ a: 30, b: 70 }}
                >
                    <Splitter.Panel id="a" />
                    <Splitter.Separator />
                    <Splitter.Panel id="b" />
                </Splitter.Group>
            );
        }
        const fresh = render(<App model={createSplitterModel()} />);
        expect(grows(fresh.container)).toEqual([30, 70]);
        fresh.unmount();
        const saved = createSplitterModel({
            version: 1,
            groups: [
                {
                    id: "g",
                    panels: [
                        { id: "a", size: 45 },
                        { id: "b", size: 55 },
                    ],
                },
            ],
        });
        const { container } = render(<App model={saved} />);
        expect(grows(container)).toEqual([45, 55]);
    });

    it("ignores a defaultLayout that does not name the group's panels", () => {
        const { container } = render(
            <Splitter.Group id="g" defaultLayout={{ x: 10, y: 90 }}>
                <Splitter.Panel id="a" />
                <Splitter.Panel id="b" />
            </Splitter.Group>,
        );
        expect(grows(container)).toEqual([50, 50]);
    });
});

describe("prop changes become commands", () => {
    it("a group's orientation and disabled flag: group.update", () => {
        const model = createSplitterModel();
        function App(props: { vertical?: boolean; disabled?: boolean }) {
            return (
                <Splitter.Group
                    id="g"
                    model={model}
                    orientation={props.vertical ? "vertical" : "horizontal"}
                    disabled={props.disabled}
                >
                    <Splitter.Panel id="a" />
                    <Splitter.Separator />
                    <Splitter.Panel id="b" />
                </Splitter.Group>
            );
        }
        const { container, rerender } = render(<App />);
        const sent = commandsOf(model);
        rerender(<App vertical disabled />);
        expect(sent()).toEqual([
            {
                command: "group.update",
                payload: {
                    groupId: "g",
                    orientation: "vertical",
                    disabled: true,
                },
            },
        ]);
        expect(at(container, "/g0").style.flexDirection).toBe("column");
        expect(at(container, "/g0")).toHaveAttribute(
            "data-orientation",
            "vertical",
        );
        expect(at(container, "/g0/s0")).toHaveAttribute("data-disabled", "");
        rerender(<App vertical disabled />);
        expect(sent()).toEqual([]);
    });

    it("a panel's constraints: panel.update, null for one removed", () => {
        const model = createSplitterModel();
        function App(props: { minSize?: string; collapsible?: boolean }) {
            return (
                <Splitter.Group id="g" model={model}>
                    <Splitter.Panel
                        id="a"
                        minSize={props.minSize}
                        collapsible={props.collapsible}
                    />
                    <Splitter.Separator />
                    <Splitter.Panel id="b" />
                </Splitter.Group>
            );
        }
        const { container, rerender } = render(<App minSize="60%" />);
        expect(grows(container)).toEqual([60, 40]);
        const sent = commandsOf(model);
        rerender(<App collapsible />);
        expect(sent()).toEqual([
            {
                command: "panel.update",
                payload: { panelId: "a", minSize: null, collapsible: true },
            },
        ]);
        expect(at(container, "/g0/p0")).toHaveAttribute("data-collapsible", "");
        rerender(<App collapsible />);
        expect(sent()).toEqual([]);
    });

    it("a separator's disabled and resetOnDoubleClick: separator.update", () => {
        const model = createSplitterModel();
        function App(props: { disabled?: boolean }) {
            return (
                <Splitter.Group id="g" model={model}>
                    <Splitter.Panel id="a" />
                    <Splitter.Separator disabled={props.disabled} />
                    <Splitter.Panel id="b" />
                </Splitter.Group>
            );
        }
        const { rerender } = render(<App />);
        const sent = commandsOf(model);
        rerender(<App disabled />);
        expect(sent()).toEqual([
            {
                command: "separator.update",
                payload: { separatorId: "a:b", disabled: true },
            },
        ]);
        expect(model.is("separator-disabled", { separatorId: "a:b" })).toBe(
            true,
        );
    });

    it("a separator's prop back to undefined sends its default", () => {
        const model = createSplitterModel();
        function App(props: { disabled?: boolean; reset?: boolean }) {
            return (
                <Splitter.Group id="g" model={model}>
                    <Splitter.Panel id="a" />
                    <Splitter.Separator
                        disabled={props.disabled}
                        resetOnDoubleClick={props.reset}
                    />
                    <Splitter.Panel id="b" />
                </Splitter.Group>
            );
        }
        const { container, rerender } = render(<App disabled reset={false} />);
        expect(model.is("separator-disabled", { separatorId: "a:b" })).toBe(
            true,
        );
        const sent = commandsOf(model);
        rerender(<App reset={false} />);
        expect(sent()).toEqual([
            {
                command: "separator.update",
                payload: { separatorId: "a:b", disabled: false },
            },
        ]);
        expect(model.is("separator-disabled", { separatorId: "a:b" })).toBe(
            false,
        );
        expect(at(container, "/g0/s0").hasAttribute("data-disabled")).toBe(
            false,
        );
        rerender(<App />);
        expect(sent()).toEqual([
            {
                command: "separator.update",
                payload: { separatorId: "a:b", resetOnDoubleClick: true },
            },
        ]);
        rerender(<App />);
        expect(sent()).toEqual([]);
    });
});

describe("the adapter's commands", () => {
    it("carry meta.source adapter, so a listener tells them from the user's steps", () => {
        const model = createSplitterModel();
        const events: CommandEvent[] = [];
        model.subscribe((event) => events.push(event));
        function App(props: {
            third?: boolean;
            min?: string;
            layout?: Layout;
        }) {
            return (
                <Splitter.Group id="g" model={model} layout={props.layout}>
                    <Splitter.Panel id="a" minSize={props.min} />
                    <Splitter.Separator disabled={props.third} />
                    <Splitter.Panel id="b" />
                    {props.third && (
                        <>
                            <Splitter.Separator />
                            <Splitter.Panel id="c" />
                        </>
                    )}
                </Splitter.Group>
            );
        }
        const { container, rerender, unmount } = render(<App />);
        rerender(<App third min="10%" layout={{ a: 20, b: 40, c: 40 }} />);
        rerender(<App min="10%" />);
        const sources = () =>
            events
                .filter(({ transient }) => !transient)
                .map(({ command, meta }) => [command, meta?.source]);
        expect(sources().length).toBeGreaterThan(3);
        expect(sources().filter(([, source]) => source !== "adapter")).toEqual(
            [],
        );
        events.length = 0;
        act(() => press(at(container, "/g0/s0"), "ArrowRight"));
        expect(sources()).toEqual([["separator.move", undefined]]);
        events.length = 0;
        unmount();
        expect(sources()).toEqual([["group.remove", "adapter"]]);
    });
});

describe("panel callbacks", () => {
    it("onResize gets the size, and the previous one (none the first time)", () => {
        const onResize = vi.fn();
        const { container } = render(
            <Splitter.Group id="g">
                <Splitter.Panel id="a" onResize={onResize} />
                <Splitter.Separator />
                <Splitter.Panel id="b" />
            </Splitter.Group>,
        );
        expect(onResize).toHaveBeenLastCalledWith(
            { percentage: 50, pixels: undefined },
            undefined,
        );
        act(() => press(at(container, "/g0/s0"), "ArrowLeft"));
        expect(onResize).toHaveBeenLastCalledWith(
            { percentage: 45, pixels: undefined },
            { percentage: 50, pixels: undefined },
        );
    });
});

describe("ids", () => {
    it("are generated when not given, and the panel's DOM id is its panel id", () => {
        const { container } = render(
            <Splitter.Group>
                <Splitter.Panel />
                <Splitter.Separator />
                <Splitter.Panel />
            </Splitter.Group>,
        );
        const panel = at(container, "/g0/p0");
        expect(panel.id).not.toBe("");
        expect(at(container, "/g0/s0")).toHaveAttribute(
            "aria-controls",
            panel.id,
        );
    });

    it("a second group with the same id in one model is reported and not registered", () => {
        const model = createSplitterModel();
        const error = vi.spyOn(console, "error").mockImplementation(() => {});
        render(
            <>
                <Splitter.Group id="g" model={model}>
                    <Splitter.Panel id="a" />
                </Splitter.Group>
                <Splitter.Group id="g" model={model}>
                    <Splitter.Panel id="b" />
                </Splitter.Group>
            </>,
        );
        expect(error).toHaveBeenCalledWith(
            expect.stringContaining('Splitter.Group "g"'),
        );
        expect(model.get("group-by", { id: "g" })?.panelIds).toEqual(["a"]);
        error.mockRestore();
    });
});
