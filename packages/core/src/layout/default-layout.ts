// The layout of panels that have no saved size. Derived from React Resizable Panels
// (https://github.com/bvaughn/react-resizable-panels,
// lib/global/utils/calculateDefaultLayout.ts). Copyright (c) 2018 Brian Vaughn. MIT licence, see
// LICENSE.
import { formatLayoutNumber } from "./numbers";
import type { Layout, ResolvedConstraints } from "./types";
import { validateLayout } from "./validate-layout";

/**
 * The default layout of a group: each panel with a `defaultSize` takes it, the others share what
 * is left equally, and the result is validated against the constraints. Pure.
 */
export function defaultLayout(
    constraints: readonly ResolvedConstraints[],
): Layout {
    let total = 0;
    let explicit = 0;
    for (const { defaultSize } of constraints) {
        if (defaultSize !== undefined) {
            explicit++;
            total += formatLayoutNumber(defaultSize);
        }
    }
    const rest = constraints.length - explicit;
    const shared = rest > 0 ? formatLayoutNumber((100 - total) / rest) : 0;
    const layout: Layout = {};
    for (const { panelId, defaultSize } of constraints) {
        layout[panelId] =
            defaultSize === undefined
                ? shared
                : formatLayoutNumber(defaultSize);
    }
    return validateLayout(layout, constraints);
}
