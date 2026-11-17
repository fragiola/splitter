import { act, render } from "@testing-library/react";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import {
    type CommandEvent,
    createSplitterModel,
    type Layout,
    Splitter,
    veto,
} from "../src";
import { at, grows, pointer, stubPanelRects } from "./helpers";

// Pointer drags (D8): the engine runs them on the separator element React rendered; each step is
// a transient commit (onLayoutChange), the release one commit (onLayoutCommit).

function App(props: {
    model?: ReturnType<typeof createSplitterModel>;
    onLayoutChange?: (layout: Readonly<Record<string, number>>) => void;
    onLayoutCommit?: (layout: Readonly<Record<string, number>>) => void;
}) {
    return (
        <Splitter.Group
            id="g"
            model={props.model}
            onLayoutChange={props.onLayoutChange}
            onLayoutCommit={props.onLayoutCommit}
        >
            <Splitter.Panel id="a" />
            <Splitter.Separator />
            <Splitter.Panel id="b" />
        </Splitter.Group>
    );
}

describe("pointer drags", () => {
    it("resize the panels, with data-dragging while the drag runs", () => {
        // two panels of 500px: the group is 1000px along its axis
        stubPanelRects(500);
        const onLayoutChange = vi.fn();
        const onLayoutCommit = vi.fn();
        const { container } = render(
            <App
                onLayoutChange={onLayoutChange}
                onLayoutCommit={onLayoutCommit}
            />,
        );
        onLayoutChange.mockClear();
        onLayoutCommit.mockClear();
        const separator = at(container, "/g0/s0");
        act(() => pointer(separator, "pointerdown", { clientX: 500 }));
        expect(separator).toHaveAttribute("data-dragging", "");
        expect(at(container, "/g0")).toHaveAttribute("data-dragging", "");
        act(() => pointer(separator, "pointermove", { clientX: 600 }));
        expect(grows(container)).toEqual([60, 40]);
        act(() => pointer(separator, "pointermove", { clientX: 700 }));
        expect(grows(container)).toEqual([70, 30]);
        expect(onLayoutChange.mock.calls).toEqual([
            [{ a: 60, b: 40 }],
            [{ a: 70, b: 30 }],
        ]);
        expect(onLayoutCommit).not.toHaveBeenCalled();
        act(() => pointer(separator, "pointerup", { clientX: 700 }));
        expect(separator).not.toHaveAttribute("data-dragging");
        expect(at(container, "/g0")).not.toHaveAttribute("data-dragging");
        expect(onLayoutCommit.mock.calls).toEqual([[{ a: 70, b: 30 }]]);
        expect(separator).toHaveAttribute("aria-valuenow", "70");
    });

    it("go back to where they started when middleware vetoes the release", () => {
        stubPanelRects(500);
        const model = createSplitterModel();
        model.use((ctx, next) =>
            ctx.command === "separator.move" && !ctx.transient
                ? veto()
                : next(),
        );
        const { container } = render(<App model={model} />);
        const separator = at(container, "/g0/s0");
        act(() => pointer(separator, "pointerdown", { clientX: 500 }));
        act(() => pointer(separator, "pointermove", { clientX: 800 }));
        expect(grows(container)).toEqual([80, 20]);
        act(() => pointer(separator, "pointerup", { clientX: 800 }));
        expect(grows(container)).toEqual([50, 50]);
    });

    describe("with a controlled layout fed back by onLayoutChange", () => {
        function Controlled(props: {
            model: ReturnType<typeof createSplitterModel>;
            onLayoutCommit: (layout: Readonly<Layout>) => void;
        }) {
            const [layout, setLayout] = useState<Readonly<Layout>>({
                a: 50,
                b: 50,
            });
            return (
                <Splitter.Group
                    id="g"
                    model={props.model}
                    layout={layout}
                    onLayoutChange={setLayout}
                    onLayoutCommit={props.onLayoutCommit}
                >
                    <Splitter.Panel id="a" />
                    <Splitter.Separator />
                    <Splitter.Panel id="b" />
                </Splitter.Group>
            );
        }

        function drag(container: HTMLElement) {
            const separator = at(container, "/g0/s0");
            act(() => pointer(separator, "pointerdown", { clientX: 500 }));
            act(() => pointer(separator, "pointermove", { clientX: 600 }));
            act(() => pointer(separator, "pointermove", { clientX: 700 }));
            act(() => pointer(separator, "pointerup", { clientX: 700 }));
        }

        it("keeps the drag steps transient and commits once", () => {
            stubPanelRects(500);
            const model = createSplitterModel();
            const onLayoutCommit = vi.fn();
            const { container } = render(
                <Controlled model={model} onLayoutCommit={onLayoutCommit} />,
            );
            const events: CommandEvent[] = [];
            model.subscribe((event) => events.push(event));
            onLayoutCommit.mockClear();
            drag(container);
            // the prop that comes back is the model's layout: no group.set-layout echoes it
            expect(
                events.map(({ command, transient }) => [command, transient]),
            ).toEqual([
                ["separator.move", true],
                ["separator.move", true],
                ["separator.move", false],
            ]);
            expect(onLayoutCommit.mock.calls).toEqual([[{ a: 70, b: 30 }]]);
            expect(grows(container)).toEqual([70, 30]);
        });

        it("goes back to where it started when middleware vetoes the release", () => {
            stubPanelRects(500);
            const model = createSplitterModel();
            model.use((ctx, next) =>
                ctx.command === "separator.move" && !ctx.transient
                    ? veto()
                    : next(),
            );
            const onLayoutCommit = vi.fn();
            const { container } = render(
                <Controlled model={model} onLayoutCommit={onLayoutCommit} />,
            );
            onLayoutCommit.mockClear();
            drag(container);
            expect(onLayoutCommit).not.toHaveBeenCalled();
            expect(model.get("layout-by", { groupId: "g" })).toEqual({
                a: 50,
                b: 50,
            });
            expect(grows(container)).toEqual([50, 50]);
        });
    });
});
