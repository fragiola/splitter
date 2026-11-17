import { describe, expect, it, vi } from "vitest";
import { defineComponent, h, ref } from "vue";
import {
    type CommandEvent,
    createSplitterModel,
    type Layout,
    Splitter,
    type SplitterModel,
    veto,
} from "../src";
import { at, grows, pointer, render, stubPanelRects } from "./helpers";

// Pointer drags (D8): the engine runs them on the separator element Vue rendered; each step is a
// transient commit (`update:layout`), the release one commit (`layout-commit`). Vue never
// reconciles what the engine does mid-drag.

function app(
    props: {
        model?: SplitterModel;
        onLayoutChange?: (layout: Readonly<Record<string, number>>) => void;
        onLayoutCommit?: (layout: Readonly<Record<string, number>>) => void;
    } = {},
) {
    return h(
        Splitter.Group,
        {
            id: "g",
            model: props.model,
            "onUpdate:layout": props.onLayoutChange,
            onLayoutCommit: props.onLayoutCommit,
        },
        () => [
            h(Splitter.Panel, { id: "a" }),
            h(Splitter.Separator),
            h(Splitter.Panel, { id: "b" }),
        ],
    );
}

function vetoRelease(model: SplitterModel): void {
    model.use((ctx, next) =>
        ctx.command === "separator.move" && !ctx.transient ? veto() : next(),
    );
}

describe("pointer drags", () => {
    it("resize the panels, with data-dragging while the drag runs", async () => {
        // two panels of 500px: the group is 1000px along its axis
        stubPanelRects(500);
        const onLayoutChange = vi.fn();
        const onLayoutCommit = vi.fn();
        const { container } = await render(() =>
            app({ onLayoutChange, onLayoutCommit }),
        );
        onLayoutChange.mockClear();
        onLayoutCommit.mockClear();
        const separator = at(container, "/g0/s0");
        await pointer(separator, "pointerdown", { clientX: 500 });
        expect(separator).toHaveAttribute("data-dragging", "");
        expect(at(container, "/g0")).toHaveAttribute("data-dragging", "");
        await pointer(separator, "pointermove", { clientX: 600 });
        expect(grows(container)).toEqual([60, 40]);
        await pointer(separator, "pointermove", { clientX: 700 });
        expect(grows(container)).toEqual([70, 30]);
        expect(onLayoutChange.mock.calls).toEqual([
            [{ a: 60, b: 40 }],
            [{ a: 70, b: 30 }],
        ]);
        expect(onLayoutCommit).not.toHaveBeenCalled();
        await pointer(separator, "pointerup", { clientX: 700 });
        expect(separator).not.toHaveAttribute("data-dragging");
        expect(at(container, "/g0")).not.toHaveAttribute("data-dragging");
        expect(onLayoutCommit.mock.calls).toEqual([[{ a: 70, b: 30 }]]);
        expect(separator).toHaveAttribute("aria-valuenow", "70");
    });

    it("go back to where they started when middleware vetoes the release", async () => {
        stubPanelRects(500);
        const model = createSplitterModel();
        vetoRelease(model);
        const { container } = await render(() => app({ model }));
        const separator = at(container, "/g0/s0");
        await pointer(separator, "pointerdown", { clientX: 500 });
        await pointer(separator, "pointermove", { clientX: 800 });
        expect(grows(container)).toEqual([80, 20]);
        await pointer(separator, "pointerup", { clientX: 800 });
        expect(grows(container)).toEqual([50, 50]);
    });

    describe("with v-model:layout", () => {
        const Controlled = defineComponent({
            props: {
                model: { type: Object, required: true },
                onCommit: { type: Function, required: true },
            },
            setup(props) {
                const layout = ref<Readonly<Layout>>({ a: 50, b: 50 });
                return () =>
                    h(
                        Splitter.Group,
                        {
                            id: "g",
                            model: props.model as SplitterModel,
                            layout: layout.value,
                            "onUpdate:layout": (next: Readonly<Layout>) => {
                                layout.value = next;
                            },
                            onLayoutCommit: props.onCommit as (
                                layout: Readonly<Layout>,
                            ) => void,
                        },
                        () => [
                            h(Splitter.Panel, { id: "a" }),
                            h(Splitter.Separator),
                            h(Splitter.Panel, { id: "b" }),
                        ],
                    );
            },
        });

        async function drag(container: HTMLElement) {
            const separator = at(container, "/g0/s0");
            await pointer(separator, "pointerdown", { clientX: 500 });
            await pointer(separator, "pointermove", { clientX: 600 });
            await pointer(separator, "pointermove", { clientX: 700 });
            await pointer(separator, "pointerup", { clientX: 700 });
        }

        it("keeps the drag steps transient and commits once", async () => {
            stubPanelRects(500);
            const model = createSplitterModel();
            const onCommit = vi.fn();
            const { container } = await render(() =>
                h(Controlled, { model, onCommit }),
            );
            const events: CommandEvent[] = [];
            model.subscribe((event) => events.push(event));
            onCommit.mockClear();
            await drag(container);
            // the prop that comes back is the model's layout: no group.set-layout echoes it
            expect(
                events.map(({ command, transient }) => [command, transient]),
            ).toEqual([
                ["separator.move", true],
                ["separator.move", true],
                ["separator.move", false],
            ]);
            expect(onCommit.mock.calls).toEqual([[{ a: 70, b: 30 }]]);
            expect(grows(container)).toEqual([70, 30]);
        });

        it("goes back to where it started when middleware vetoes the release", async () => {
            stubPanelRects(500);
            const model = createSplitterModel();
            vetoRelease(model);
            const onCommit = vi.fn();
            const { container } = await render(() =>
                h(Controlled, { model, onCommit }),
            );
            onCommit.mockClear();
            await drag(container);
            expect(onCommit).not.toHaveBeenCalled();
            expect(model.get("layout-by", { groupId: "g" })).toEqual({
                a: 50,
                b: 50,
            });
            expect(grows(container)).toEqual([50, 50]);
        });
    });
});
