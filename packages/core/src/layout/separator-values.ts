// A separator's value range for assistive technology. Derived from React Resizable Panels
// (https://github.com/bvaughn/react-resizable-panels,
// lib/global/utils/calculateSeparatorAriaValues.ts). Copyright (c) 2018 Brian Vaughn. MIT licence,
// see LICENSE.
import { adjustLayoutByDelta } from "./adjust-layout-by-delta";
import type { Layout, ResolvedConstraints } from "./types";
import { validateLayout } from "./validate-layout";

/**
 * A separator's values, from the panel before it (the primary panel of the Window Splitter
 * pattern): its size now, and the smallest and largest it can reach by moving this separator.
 */
export interface SeparatorValues {
    /** the panel the separator resizes: `aria-controls` points at it */
    readonly panelId: string;
    readonly valueNow: number;
    readonly valueMin: number;
    readonly valueMax: number;
}

/**
 * The values of the separator after panel `index` of a group (its primary panel), in percent.
 * Undefined when there is no panel after it. Pure.
 */
export function separatorValues(
    layout: Layout,
    constraints: readonly ResolvedConstraints[],
    index: number,
): SeparatorValues | undefined {
    const item = constraints[index];
    if (!item || index + 1 >= constraints.length) {
        return undefined;
    }
    const size = layout[item.panelId] ?? 0;
    const reach = (target: number): number => {
        const moved = validateLayout(
            adjustLayoutByDelta({
                delta: target - size,
                initialLayout: layout,
                prevLayout: layout,
                constraints,
                pivotIndices: [index, index + 1],
                trigger: "pointer",
            }),
            constraints,
        );
        return moved[item.panelId] ?? size;
    };
    return {
        panelId: item.panelId,
        valueNow: size,
        valueMin: reach(item.collapsible ? item.collapsedSize : item.minSize),
        valueMax: reach(item.maxSize),
    };
}
