// A panel size clamped to its constraints, with the collapse threshold. Derived from React
// Resizable Panels (https://github.com/bvaughn/react-resizable-panels,
// lib/global/utils/validateItemSize.ts). Copyright (c) 2018 Brian Vaughn. MIT licence, see LICENSE.
import { compareLayoutNumbers, formatLayoutNumber } from "./numbers";
import type { ResolvedConstraints } from "./types";

export interface ValidatePanelSizeInput {
    readonly constraints: ResolvedConstraints;
    /** the panel's size before the change */
    readonly prevSize: number;
    /** the size asked for */
    readonly size: number;
    /** resize a disabled panel anyway (a change from code) */
    readonly overrideDisabled?: boolean;
}

/**
 * The size a panel takes when `size` is asked for: its previous size when it is disabled; below
 * its minimum, a collapsible panel snaps to collapsed or to its minimum at the collapse threshold
 * (`collapsedThreshold`, default halfway between the two), any other panel to its minimum; never
 * above its maximum.
 */
export function validatePanelSize({
    constraints,
    prevSize,
    size,
    overrideDisabled = false,
}: ValidatePanelSizeInput): number {
    const {
        collapsedSize,
        collapsedThreshold,
        collapsible,
        disabled,
        maxSize,
        minSize,
    } = constraints;

    if (disabled && !overrideDisabled) {
        return prevSize;
    }

    let next = size;
    if (compareLayoutNumbers(next, minSize) < 0) {
        if (collapsible) {
            const threshold =
                collapsedThreshold ?? (minSize - collapsedSize) / 2;
            const wasCollapsed =
                compareLayoutNumbers(prevSize, collapsedSize) <= 0;
            const boundary = wasCollapsed
                ? collapsedSize + threshold
                : minSize - threshold;
            const comparison = compareLayoutNumbers(next, boundary);
            next =
                compareLayoutNumbers(next, collapsedSize) <= 0 ||
                comparison < 0 ||
                (collapsedThreshold !== undefined &&
                    wasCollapsed &&
                    comparison === 0)
                    ? collapsedSize
                    : minSize;
        } else {
            next = minSize;
        }
    }
    return formatLayoutNumber(Math.min(maxSize, next));
}
