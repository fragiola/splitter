// Moving the boundary between two panels: clamping, collapse thresholds and redistribution
// (neighbours first, then the panels further away). Derived from React Resizable Panels
// (https://github.com/bvaughn/react-resizable-panels, lib/global/utils/adjustLayoutByDelta.ts).
// Copyright (c) 2018 Brian Vaughn. MIT licence, see LICENSE.
import {
    compareLayoutNumbers,
    formatLayoutNumber,
    layoutNumbersEqual,
} from "./numbers";
import type { Layout, ResizeTrigger, ResolvedConstraints } from "./types";
import { validatePanelSize } from "./validate-panel-size";

export interface AdjustLayoutByDeltaInput {
    /** how far the boundary moves, in percent: positive grows the panels before it */
    readonly delta: number;
    /** the layout the move is measured from (a drag's layout when it started) */
    readonly initialLayout: Layout;
    /** the layout now: returned when the move cannot apply */
    readonly prevLayout: Layout;
    /** every panel of the group, in order */
    readonly constraints: readonly ResolvedConstraints[];
    /** the indices of the two panels around the boundary */
    readonly pivotIndices: readonly [number, number];
    readonly trigger: ResizeTrigger;
}

function sizes(layout: Layout, constraints: readonly ResolvedConstraints[]) {
    return constraints.map(({ panelId }) => layout[panelId] ?? 0);
}

function sameSizes(a: readonly number[], b: readonly number[]): boolean {
    return a.length === b.length && a.every((size, i) => size === b[i]);
}

/**
 * The layout after moving the boundary between `pivotIndices` by `delta` from `initialLayout`:
 * the panels on the shrinking side give space, nearest first, within their constraints, and the
 * panel on the growing side takes what they gave. `prevLayout` when nothing can move or the
 * result would not sum to 100. Pure: the inputs are not changed.
 */
export function adjustLayoutByDelta({
    delta: requested,
    initialLayout,
    prevLayout,
    constraints,
    pivotIndices,
    trigger,
}: AdjustLayoutByDeltaInput): Layout {
    if (layoutNumbersEqual(requested, 0)) {
        return initialLayout;
    }
    const overrideDisabled = trigger === "code";
    const initial = sizes(initialLayout, constraints);
    const prev = sizes(prevLayout, constraints);
    const next = [...initial];
    const [first, second] = pivotIndices;
    const count = constraints.length;
    const constraintsAt = (index: number): ResolvedConstraints | undefined =>
        constraints[index];
    const initialAt = (index: number): number => initial[index] ?? 0;

    let delta = requested;
    let deltaApplied = 0;

    if (trigger === "keyboard") {
        // the keyboard expands a collapsed panel to its minimum, or collapses one at its minimum,
        // in one step (no halfway threshold, which could keep it from ever expanding)
        {
            const index = delta < 0 ? second : first;
            const item = constraintsAt(index);
            if (item?.collapsible) {
                const prevSize = initialAt(index);
                if (layoutNumbersEqual(prevSize, item.collapsedSize)) {
                    const local = item.minSize - prevSize;
                    if (compareLayoutNumbers(local, Math.abs(delta)) > 0) {
                        delta = delta < 0 ? -local : local;
                    }
                }
            }
        }
        {
            const index = delta < 0 ? first : second;
            const item = constraintsAt(index);
            if (item?.collapsible) {
                const prevSize = initialAt(index);
                if (layoutNumbersEqual(prevSize, item.minSize)) {
                    const local = prevSize - item.collapsedSize;
                    if (compareLayoutNumbers(local, Math.abs(delta)) > 0) {
                        delta = delta < 0 ? -local : local;
                    }
                }
            }
        }
    } else {
        // a collapsed panel dragged open expands once the drag passes its threshold
        const index = delta < 0 ? second : first;
        const item = constraintsAt(index);
        const prevSize = initialAt(index);
        if (
            item?.collapsible &&
            compareLayoutNumbers(prevSize, item.minSize) < 0
        ) {
            const gap = item.minSize - item.collapsedSize;
            const threshold = item.collapsedThreshold ?? gap / 2;
            if (
                compareLayoutNumbers(prevSize + Math.abs(delta), item.minSize) <
                0
            ) {
                const comparison = compareLayoutNumbers(
                    Math.abs(delta),
                    threshold,
                );
                const expandAtBoundary =
                    item.collapsedThreshold === undefined && delta < 0;
                delta =
                    comparison > 0 || (comparison === 0 && expandAtBoundary)
                        ? delta < 0
                            ? -gap
                            : gap
                        : 0;
            }
        }
    }

    {
        // the most the growing side can take: cap the delta with it
        const increment = delta < 0 ? 1 : -1;
        let index = delta < 0 ? second : first;
        let available = 0;
        while (index >= 0 && index < count) {
            const item = constraintsAt(index);
            const prevSize = initialAt(index);
            if (item) {
                available +=
                    validatePanelSize({
                        constraints: item,
                        prevSize,
                        size: 100,
                        overrideDisabled,
                    }) - prevSize;
            }
            index += increment;
        }
        const capped = Math.min(Math.abs(delta), Math.abs(available));
        delta = delta < 0 ? -capped : capped;
    }

    {
        // the shrinking side gives the delta, nearest panel first
        let index = delta < 0 ? first : second;
        while (index >= 0 && index < count) {
            const item = constraintsAt(index);
            const prevSize = initialAt(index);
            if (item) {
                const remaining = Math.abs(delta) - Math.abs(deltaApplied);
                const safe = validatePanelSize({
                    constraints: item,
                    prevSize,
                    size: prevSize - remaining,
                    overrideDisabled,
                });
                if (!layoutNumbersEqual(prevSize, safe)) {
                    deltaApplied += prevSize - safe;
                    next[index] = safe;
                    if (
                        compareLayoutNumbers(
                            formatLayoutNumber(deltaApplied),
                            formatLayoutNumber(Math.abs(delta)),
                        ) >= 0
                    ) {
                        break;
                    }
                }
            }
            index += delta < 0 ? -1 : 1;
        }
    }

    // nothing could move: keep the layout as it is (a drag past a panel's limit)
    if (sameSizes(prev, next)) {
        return prevLayout;
    }

    {
        // the growing pivot takes what the other side gave
        const pivot = delta < 0 ? second : first;
        const item = constraintsAt(pivot);
        const prevSize = initialAt(pivot);
        const unsafe = prevSize + deltaApplied;
        const safe = item
            ? validatePanelSize({
                  constraints: item,
                  prevSize,
                  size: unsafe,
                  overrideDisabled,
              })
            : unsafe;
        next[pivot] = safe;

        // it could not take it all (its maximum, or a collapse snap): the panels beyond it do
        if (!layoutNumbersEqual(safe, unsafe)) {
            let remaining = unsafe - safe;
            let index = pivot;
            while (index >= 0 && index < count) {
                const other = constraintsAt(index);
                const otherPrev = next[index] ?? 0;
                if (other) {
                    const otherSafe = validatePanelSize({
                        constraints: other,
                        prevSize: otherPrev,
                        size: otherPrev + remaining,
                        overrideDisabled,
                    });
                    if (!layoutNumbersEqual(otherPrev, otherSafe)) {
                        remaining -= otherSafe - otherPrev;
                        next[index] = otherSafe;
                    }
                }
                if (layoutNumbersEqual(remaining, 0)) {
                    break;
                }
                index += delta > 0 ? -1 : 1;
            }
        }
    }

    // a layout that does not sum to 100 means the delta cannot apply (a small rounding is fine)
    const total = next.reduce((sum, size) => sum + size, 0);
    if (!layoutNumbersEqual(total, 100, 0.1)) {
        return prevLayout;
    }

    const layout: Layout = {};
    constraints.forEach(({ panelId }, index) => {
        layout[panelId] = next[index] ?? 0;
    });
    return layout;
}
