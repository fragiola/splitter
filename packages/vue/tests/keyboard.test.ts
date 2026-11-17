import { describe, expect, it, vi } from "vitest";
import { h, shallowRef, type VNodeChild } from "vue";
import { Splitter } from "../src";
import { at, doubleClick, grows, press, render, settle } from "./helpers";

// The keyboard (D8, WAI-ARIA APG Window Splitter): the engine answers keys on a focused separator;
// Vue renders the result.

function app(
    props: {
        onCollapse?: () => void;
        onExpand?: () => void;
        onLayoutChange?: (layout: Readonly<Record<string, number>>) => void;
        onLayoutCommit?: (layout: Readonly<Record<string, number>>) => void;
        keyboardStep?: number;
        disabled?: boolean;
    } = {},
): VNodeChild {
    return h("div", [
        h(
            Splitter.Group,
            {
                id: "g",
                keyboardStep: props.keyboardStep,
                onLayoutChange: props.onLayoutChange,
                onLayoutCommit: props.onLayoutCommit,
            },
            () => [
                h(Splitter.Panel, {
                    id: "a",
                    minSize: "20%",
                    maxSize: "80%",
                    collapsible: true,
                    collapsedSize: "5%",
                    onCollapse: props.onCollapse,
                    onExpand: props.onExpand,
                }),
                h(Splitter.Separator, {
                    "aria-label": "Resize",
                    disabled: props.disabled,
                }),
                h(Splitter.Panel, { id: "b" }),
            ],
        ),
    ]);
}

describe("the keyboard", () => {
    it("resizes with the arrows and updates the ARIA value", async () => {
        const { container } = await render(() => app());
        const separator = at(container, "/g0/s0");
        await press(separator, "ArrowRight");
        expect(grows(container)).toEqual([55, 45]);
        expect(separator).toHaveAttribute("aria-valuenow", "55");
        await press(separator, "ArrowLeft");
        await press(separator, "ArrowLeft");
        expect(grows(container)).toEqual([45, 55]);
    });

    it("uses the root group's keyboard step", async () => {
        const { container } = await render(() => app({ keyboardStep: 10 }));
        await press(at(container, "/g0/s0"), "ArrowRight");
        expect(grows(container)).toEqual([60, 40]);
    });

    it("moves to the limits with Home and End", async () => {
        const { container } = await render(() => app());
        const separator = at(container, "/g0/s0");
        await press(separator, "End");
        expect(grows(container)).toEqual([80, 20]);
        await press(separator, "Home");
        // the panel before is collapsible: Home collapses it
        expect(grows(container)[0]).toBeLessThanOrEqual(20);
    });

    it("toggles collapse with Enter, with @collapse and @expand", async () => {
        const onCollapse = vi.fn();
        const onExpand = vi.fn();
        const { container } = await render(() => app({ onCollapse, onExpand }));
        const separator = at(container, "/g0/s0");
        const panel = at(container, "/g0/p0");
        await press(separator, "Enter");
        expect(grows(container)).toEqual([5, 95]);
        expect(panel).toHaveAttribute("data-collapsed", "");
        expect(onCollapse).toHaveBeenCalledTimes(1);
        await press(separator, "Enter");
        expect(grows(container)).toEqual([50, 50]);
        expect(panel).not.toHaveAttribute("data-collapsed");
        expect(onExpand).toHaveBeenCalledTimes(1);
    });

    it("reports each key as a change and a commit", async () => {
        const onLayoutChange = vi.fn();
        const onLayoutCommit = vi.fn();
        const { container } = await render(() =>
            app({ onLayoutChange, onLayoutCommit }),
        );
        // the layout it registered with is a change, not a commit
        expect(onLayoutChange).toHaveBeenLastCalledWith({ a: 50, b: 50 });
        expect(onLayoutCommit).not.toHaveBeenCalled();
        await press(at(container, "/g0/s0"), "ArrowRight");
        expect(onLayoutChange).toHaveBeenLastCalledWith({ a: 55, b: 45 });
        expect(onLayoutCommit).toHaveBeenLastCalledWith({ a: 55, b: 45 });
        // a key that changes nothing reports nothing
        const calls = onLayoutChange.mock.calls.length;
        await press(at(container, "/g0/s0"), "a");
        expect(onLayoutChange).toHaveBeenCalledTimes(calls);
    });

    it("ignores a disabled separator, which leaves the tab order", async () => {
        const { container } = await render(() => app({ disabled: true }));
        const separator = at(container, "/g0/s0");
        expect(separator).not.toHaveAttribute("tabindex");
        expect(separator).toHaveAttribute("data-disabled", "");
        await press(separator, "ArrowRight");
        expect(grows(container)).toEqual([50, 50]);
    });

    it("double click resets the panel to its default size", async () => {
        const reset = shallowRef<boolean | undefined>(undefined);
        const { container } = await render(() =>
            h(Splitter.Group, { id: "g" }, () => [
                h(Splitter.Panel, { id: "a", defaultSize: "30%" }),
                h(Splitter.Separator, { resetOnDoubleClick: reset.value }),
                h(Splitter.Panel, { id: "b" }),
            ]),
        );
        const separator = at(container, "/g0/s0");
        await press(separator, "ArrowRight");
        expect(grows(container)).toEqual([35, 65]);
        await doubleClick(separator);
        expect(grows(container)).toEqual([30, 70]);
        reset.value = false;
        await settle();
        await press(separator, "ArrowRight");
        await doubleClick(separator);
        expect(grows(container)).toEqual([35, 65]);
    });
});
