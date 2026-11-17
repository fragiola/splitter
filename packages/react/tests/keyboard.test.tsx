import { act, render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { Splitter } from "../src";
import { at, grows, press } from "./helpers";

// The keyboard (D8, WAI-ARIA APG Window Splitter): the engine answers keys on a focused separator;
// React renders the result.

function App(props: {
    onCollapse?: () => void;
    onExpand?: () => void;
    onLayoutChange?: (layout: Readonly<Record<string, number>>) => void;
    onLayoutCommit?: (layout: Readonly<Record<string, number>>) => void;
    keyboardStep?: number;
    disabled?: boolean;
}) {
    return (
        <div>
            <Splitter.Group
                id="g"
                keyboardStep={props.keyboardStep}
                onLayoutChange={props.onLayoutChange}
                onLayoutCommit={props.onLayoutCommit}
            >
                <Splitter.Panel
                    id="a"
                    minSize="20%"
                    maxSize="80%"
                    collapsible
                    collapsedSize="5%"
                    onCollapse={props.onCollapse}
                    onExpand={props.onExpand}
                />
                <Splitter.Separator
                    aria-label="Resize"
                    disabled={props.disabled}
                />
                <Splitter.Panel id="b" />
            </Splitter.Group>
        </div>
    );
}

describe("the keyboard", () => {
    it("resizes with the arrows and updates the ARIA value", () => {
        const { container } = render(<App />);
        const separator = at(container, "/g0/s0");
        act(() => press(separator, "ArrowRight"));
        expect(grows(container)).toEqual([55, 45]);
        expect(separator).toHaveAttribute("aria-valuenow", "55");
        act(() => press(separator, "ArrowLeft"));
        act(() => press(separator, "ArrowLeft"));
        expect(grows(container)).toEqual([45, 55]);
    });

    it("uses the root group's keyboard step", () => {
        const { container } = render(<App keyboardStep={10} />);
        act(() => press(at(container, "/g0/s0"), "ArrowRight"));
        expect(grows(container)).toEqual([60, 40]);
    });

    it("moves to the limits with Home and End", () => {
        const { container } = render(<App />);
        const separator = at(container, "/g0/s0");
        act(() => press(separator, "End"));
        expect(grows(container)).toEqual([80, 20]);
        act(() => press(separator, "Home"));
        // the panel before is collapsible: Home collapses it
        expect(grows(container)[0]).toBeLessThanOrEqual(20);
    });

    it("toggles collapse with Enter, with onCollapse and onExpand", () => {
        const onCollapse = vi.fn();
        const onExpand = vi.fn();
        const { container } = render(
            <App onCollapse={onCollapse} onExpand={onExpand} />,
        );
        const separator = at(container, "/g0/s0");
        const panel = at(container, "/g0/p0");
        act(() => press(separator, "Enter"));
        expect(grows(container)).toEqual([5, 95]);
        expect(panel).toHaveAttribute("data-collapsed", "");
        expect(onCollapse).toHaveBeenCalledTimes(1);
        act(() => press(separator, "Enter"));
        expect(grows(container)).toEqual([50, 50]);
        expect(panel).not.toHaveAttribute("data-collapsed");
        expect(onExpand).toHaveBeenCalledTimes(1);
    });

    it("reports each key as a change and a commit", () => {
        const onLayoutChange = vi.fn();
        const onLayoutCommit = vi.fn();
        const { container } = render(
            <App
                onLayoutChange={onLayoutChange}
                onLayoutCommit={onLayoutCommit}
            />,
        );
        // the layout it registered with is a change, not a commit
        expect(onLayoutChange).toHaveBeenLastCalledWith({ a: 50, b: 50 });
        expect(onLayoutCommit).not.toHaveBeenCalled();
        act(() => press(at(container, "/g0/s0"), "ArrowRight"));
        expect(onLayoutChange).toHaveBeenLastCalledWith({ a: 55, b: 45 });
        expect(onLayoutCommit).toHaveBeenLastCalledWith({ a: 55, b: 45 });
        // a key that changes nothing reports nothing
        const calls = onLayoutChange.mock.calls.length;
        act(() => press(at(container, "/g0/s0"), "a"));
        expect(onLayoutChange).toHaveBeenCalledTimes(calls);
    });

    it("ignores a disabled separator, which leaves the tab order", () => {
        const { container } = render(<App disabled />);
        const separator = at(container, "/g0/s0");
        expect(separator).not.toHaveAttribute("tabindex");
        expect(separator).toHaveAttribute("data-disabled", "");
        act(() => press(separator, "ArrowRight"));
        expect(grows(container)).toEqual([50, 50]);
    });

    it("double click resets the panel to its default size", () => {
        function Defaults(props: { reset?: boolean }) {
            return (
                <Splitter.Group id="g">
                    <Splitter.Panel id="a" defaultSize="30%" />
                    <Splitter.Separator resetOnDoubleClick={props.reset} />
                    <Splitter.Panel id="b" />
                </Splitter.Group>
            );
        }
        const { container, rerender } = render(<Defaults />);
        const separator = at(container, "/g0/s0");
        act(() => press(separator, "ArrowRight"));
        expect(grows(container)).toEqual([35, 65]);
        act(() => {
            separator.dispatchEvent(
                new MouseEvent("dblclick", { bubbles: true, cancelable: true }),
            );
        });
        expect(grows(container)).toEqual([30, 70]);
        rerender(<Defaults reset={false} />);
        act(() => press(separator, "ArrowRight"));
        act(() => {
            separator.dispatchEvent(
                new MouseEvent("dblclick", { bubbles: true, cancelable: true }),
            );
        });
        expect(grows(container)).toEqual([35, 65]);
    });
});
