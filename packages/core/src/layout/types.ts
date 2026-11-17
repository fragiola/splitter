/**
 * A group's layout: each panel's size by `panelId`, a percentage from 0 to 100; the sizes of a
 * group sum to 100.
 */
export type Layout = Record<string, number>;

/**
 * How a panel behaves when its group resizes: `preserve-relative-size` (the default) keeps its
 * percentage; `preserve-pixel-size` keeps its size in pixels, and the other panels share the rest.
 */
export type GroupResizeBehavior =
    | "preserve-relative-size"
    | "preserve-pixel-size";

/**
 * A panel's constraints resolved to percentages of its group: what the layout rules work with. A
 * declared size that cannot be resolved yet (pixels before the group is measured) falls back to
 * no constraint: `minSize` 0, `maxSize` 100, `collapsedSize` 0, no `defaultSize`.
 */
export interface ResolvedConstraints {
    readonly panelId: string;
    readonly minSize: number;
    readonly maxSize: number;
    readonly defaultSize: number | undefined;
    readonly collapsible: boolean;
    readonly collapsedSize: number;
    readonly collapsedThreshold: number | undefined;
    readonly disabled: boolean;
    readonly groupResizeBehavior: GroupResizeBehavior;
}

/**
 * What started a layout change, which decides how the rules treat it: a pointer drag snaps a
 * collapsible panel at its threshold, the keyboard collapses or expands it in one step, and code
 * may resize disabled panels.
 */
export type ResizeTrigger = "pointer" | "keyboard" | "code";
