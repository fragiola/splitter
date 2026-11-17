import type { Orientation } from "../state/types";

/** What a key does on a focused separator (WAI-ARIA APG Window Splitter). */
export type SeparatorKeyIntent =
    /** move the separator by `delta` percent (positive grows the panel before it) */
    | { readonly type: "move"; readonly delta: number }
    /** collapse the panel before the separator, or expand it back */
    | { readonly type: "toggle" }
    /** move focus to the next (or previous) separator of the group */
    | { readonly type: "cycle"; readonly backwards: boolean };

export interface SeparatorKeyInput {
    /** `KeyboardEvent.key` */
    readonly key: string;
    readonly shiftKey?: boolean;
    /** the group's orientation */
    readonly orientation: Orientation;
    /** the group's inline direction: in `rtl` a horizontal group's panels run right to left */
    readonly direction: "ltr" | "rtl";
    /** how far an arrow moves the separator, in percent */
    readonly step: number;
}

/**
 * What a key does on a separator, or undefined when it does nothing: the arrows along the group's
 * orientation move it by `step` (mirrored in right-to-left: the arrow pointing at the start side
 * shrinks the panel before it), Home gives the panel before it its smallest size, End its largest,
 * Enter collapses or expands it, F6 moves to the next separator (Shift+F6 to the previous one).
 * Pure.
 */
export function separatorKeyIntent({
    key,
    shiftKey = false,
    orientation,
    direction,
    step,
}: SeparatorKeyInput): SeparatorKeyIntent | undefined {
    const forward = direction === "rtl" ? -step : step;
    switch (key) {
        case "ArrowLeft":
            return orientation === "horizontal"
                ? { type: "move", delta: -forward }
                : undefined;
        case "ArrowRight":
            return orientation === "horizontal"
                ? { type: "move", delta: forward }
                : undefined;
        case "ArrowUp":
            return orientation === "vertical"
                ? { type: "move", delta: -step }
                : undefined;
        case "ArrowDown":
            return orientation === "vertical"
                ? { type: "move", delta: step }
                : undefined;
        case "Home":
            return { type: "move", delta: -100 };
        case "End":
            return { type: "move", delta: 100 };
        case "Enter":
            return { type: "toggle" };
        case "F6":
            return { type: "cycle", backwards: shiftKey };
        default:
            return undefined;
    }
}
