// Resizing one panel to a size: the nearest panels absorb the change without collapsing or
// expanding, else the change cascades. Derived from React Resizable Panels
// (https://github.com/bvaughn/react-resizable-panels,
// lib/global/utils/getImperativeItemMethods.ts). Copyright (c) 2018 Brian Vaughn. MIT licence,
// see LICENSE.
import { adjustLayoutByDelta } from "./adjust-layout-by-delta";
import {
    compareLayoutNumbers,
    formatLayoutNumber,
    layoutNumbersEqual,
} from "./numbers";
import type { Layout, ResolvedConstraints } from "./types";
import { validateLayout } from "./validate-layout";
import { validatePanelSize } from "./validate-panel-size";

export interface ResizePanelInput {
    readonly layout: Layout;
    readonly constraints: readonly ResolvedConstraints[];
    readonly panelId: string;
    /** the size asked for, in percent */
    readonly size: number;
    /**
     * accept a size short of `size` when the other panels cannot make room for all of it (as long
     * as it is at least the panel's minimum): how a panel expands to the largest size that fits
     */
    readonly allowPartialSize?: boolean;
}

/** Whether a panel is collapsed in a layout: collapsible, and at its collapsed size. */
export function isCollapsedIn(
    item: ResolvedConstraints,
    layout: Layout,
): boolean {
    return (
        item.collapsible &&
        layoutNumbersEqual(layout[item.panelId] ?? 0, item.collapsedSize)
    );
}

function changesOtherCollapsedState(
    constraints: readonly ResolvedConstraints[],
    panelId: string,
    prev: Layout,
    next: Layout,
): boolean {
    return constraints.some(
        (item) =>
            item.panelId !== panelId &&
            isCollapsedIn(item, prev) !== isCollapsedIn(item, next),
    );
}

function computeLayout({
    layout,
    constraints,
    panelId,
    size,
    allowPartialSize = false,
}: ResizePanelInput): Layout {
    const index = constraints.findIndex((item) => item.panelId === panelId);
    const item = constraints[index];
    if (!item) {
        return layout;
    }
    const prevSize = layout[panelId] ?? 0;
    const isFirst = index === 0;
    const isLast = index === constraints.length - 1;

    // the last panel shrinking while every panel before it is collapsed keeps the rest itself
    const allPreviousCollapsed =
        isLast &&
        size < prevSize &&
        constraints
            .slice(0, index)
            .every((other) => isCollapsedIn(other, layout));
    if (allPreviousCollapsed) {
        const occupied = constraints
            .slice(0, index)
            .reduce((total, other) => total + (layout[other.panelId] ?? 0), 0);
        return { ...layout, [panelId]: formatLayoutNumber(100 - occupied) };
    }

    // first try without collapsing or expanding another panel: the nearest panels that can absorb
    // the change take it, never past their minimum (or maximum), the panels after first
    const target = validatePanelSize({
        constraints: item,
        prevSize,
        size,
        overrideDisabled: true,
    });
    const fitted: Layout = { ...layout };
    let remaining = target - prevSize;
    for (const step of isFirst ? [1] : isLast ? [-1] : [1, -1]) {
        for (
            let current = index + step;
            current >= 0 &&
            current < constraints.length &&
            !layoutNumbersEqual(remaining, 0);
            current += step
        ) {
            const other = constraints[current];
            if (!other) {
                continue;
            }
            const otherSize = fitted[other.panelId] ?? 0;
            if (
                isCollapsedIn(other, fitted) ||
                (remaining > 0
                    ? compareLayoutNumbers(otherSize, other.minSize) <= 0
                    : compareLayoutNumbers(otherSize, other.maxSize) >= 0)
            ) {
                continue;
            }
            const next =
                remaining > 0
                    ? Math.max(other.minSize, otherSize - remaining)
                    : Math.min(other.maxSize, otherSize - remaining);
            remaining -= otherSize - next;
            fitted[other.panelId] = formatLayoutNumber(next);
        }
    }
    fitted[panelId] = formatLayoutNumber(target - remaining);
    if (
        layoutNumbersEqual(remaining, 0) ||
        (allowPartialSize &&
            compareLayoutNumbers(fitted[panelId] ?? 0, item.minSize) >= 0)
    ) {
        return fitted;
    }

    // else a change that may collapse or expand other panels, cascading away from this one
    const adjustAgainst = (
        side: "after" | "before",
        from: Layout,
        sizeDelta: number,
    ): Layout => {
        const step = side === "after" ? 1 : -1;
        const findPartner = (
            predicate: (other: ResolvedConstraints) => boolean,
        ): number | undefined => {
            for (
                let current = index + step;
                current >= 0 && current < constraints.length;
                current += step
            ) {
                const other = constraints[current];
                if (other && !isCollapsedIn(other, from) && predicate(other)) {
                    return current;
                }
            }
            return undefined;
        };
        const partner =
            findPartner((other) =>
                sizeDelta > 0
                    ? compareLayoutNumbers(
                          from[other.panelId] ?? 0,
                          other.minSize,
                      ) > 0
                    : compareLayoutNumbers(
                          from[other.panelId] ?? 0,
                          other.maxSize,
                      ) < 0,
            ) ??
            findPartner(() => true) ??
            index + step;
        return adjustLayoutByDelta({
            delta: side === "after" ? sizeDelta : -sizeDelta,
            initialLayout: from,
            prevLayout: from,
            constraints,
            pivotIndices:
                side === "after" ? [index, partner] : [partner, index],
            trigger: "code",
        });
    };

    if (isFirst || isLast) {
        return adjustAgainst(
            isLast ? "before" : "after",
            layout,
            size - prevSize,
        );
    }

    const adjustAgainstBothSides = (first: "after" | "before"): Layout => {
        const once = adjustAgainst(first, layout, size - prevSize);
        const left = size - (once[panelId] ?? 0);
        return layoutNumbersEqual(left, 0)
            ? once
            : adjustAgainst(first === "after" ? "before" : "after", once, left);
    };

    // prefer the panels after this one, unless that collapses or expands one of them and the
    // other side would not
    const after = adjustAgainstBothSides("after");
    if (changesOtherCollapsedState(constraints, panelId, layout, after)) {
        const before = adjustAgainstBothSides("before");
        if (!changesOtherCollapsedState(constraints, panelId, layout, before)) {
            return before;
        }
    }
    return after;
}

/**
 * The layout after resizing one panel to `size` percent (from code: a disabled panel may be
 * resized), validated against the constraints. Pure.
 */
export function resizePanel(input: ResizePanelInput): Layout {
    const prevSize = input.layout[input.panelId];
    if (prevSize === undefined || input.size === prevSize) {
        return input.layout;
    }
    return validateLayout(computeLayout(input), input.constraints);
}
