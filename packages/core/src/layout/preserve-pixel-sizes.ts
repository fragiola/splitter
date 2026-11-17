// The group resize behaviour: panels that keep their pixel size when their group resizes.
// Derived from React Resizable Panels (https://github.com/bvaughn/react-resizable-panels,
// lib/global/utils/preserveFixedItemSizes.ts). Copyright (c) 2018 Brian Vaughn. MIT licence, see
// LICENSE.
import { formatLayoutNumber } from "./numbers";
import type { Layout, ResolvedConstraints } from "./types";

export interface PreservePixelSizesInput {
    readonly layout: Layout;
    readonly constraints: readonly ResolvedConstraints[];
    /** the group's size before, in pixels */
    readonly prevAxisSize: number;
    /** the group's size now, in pixels */
    readonly nextAxisSize: number;
}

/**
 * The layout after the group went from `prevAxisSize` to `nextAxisSize` pixels: each
 * `preserve-pixel-size` panel keeps its pixels (so its percentage changes) and the
 * `preserve-relative-size` panels share the rest in proportion to their sizes. The layout as it is
 * when a size is not positive, nothing changed, or no panel preserves its pixels (or none is
 * relative). Not validated: the caller clamps the result. Pure.
 */
export function preservePixelSizes({
    layout,
    constraints,
    prevAxisSize,
    nextAxisSize,
}: PreservePixelSizesInput): Layout {
    if (
        prevAxisSize <= 0 ||
        nextAxisSize <= 0 ||
        prevAxisSize === nextAxisSize
    ) {
        return layout;
    }
    let fixedTotal = 0;
    let flexibleTotal = 0;
    const fixed = new Map<string, number>();
    const flexible: string[] = [];
    for (const { panelId, groupResizeBehavior } of constraints) {
        const size = layout[panelId] ?? 0;
        if (groupResizeBehavior === "preserve-pixel-size") {
            const next = formatLayoutNumber(
                (((size / 100) * prevAxisSize) / nextAxisSize) * 100,
            );
            fixed.set(panelId, next);
            fixedTotal += next;
        } else {
            flexible.push(panelId);
            flexibleTotal += size;
        }
    }
    if (fixed.size === 0 || flexible.length === 0) {
        return layout;
    }
    const remaining = 100 - fixedTotal;
    const next: Layout = { ...layout };
    for (const [panelId, size] of fixed) {
        next[panelId] = size;
    }
    for (const panelId of flexible) {
        next[panelId] = formatLayoutNumber(
            flexibleTotal > 0
                ? ((layout[panelId] ?? 0) / flexibleTotal) * remaining
                : remaining / flexible.length,
        );
    }
    return next;
}
