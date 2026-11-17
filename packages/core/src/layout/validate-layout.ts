// A layout made valid for its panels' constraints: scaled to sum to 100, each size clamped, and
// what clamping freed or took given to the panels that can take it. Derived from React Resizable
// Panels (https://github.com/bvaughn/react-resizable-panels,
// lib/global/utils/validateAxisLayout.ts). Copyright (c) 2018 Brian Vaughn. MIT licence, see
// LICENSE.
import { layoutNumbersEqual } from "./numbers";
import type { Layout, ResolvedConstraints } from "./types";
import { validatePanelSize } from "./validate-panel-size";

/**
 * The valid layout closest to `layout` for these panels (in order): a panel missing from it
 * counts as 0, sizes that do not sum to 100 are scaled, each size is clamped to its constraints
 * (disabled panels included: this is a layout set from code or loaded), and the difference goes to
 * the first panels that can take it. Only the panels of `constraints` are in the result. Pure.
 */
export function validateLayout(
    layout: Layout,
    constraints: readonly ResolvedConstraints[],
): Layout {
    const prev = constraints.map(({ panelId }) => layout[panelId] ?? 0);
    const next = [...prev];
    const total = next.reduce((sum, size) => sum + size, 0);

    if (next.length > 0 && !layoutNumbersEqual(total, 100)) {
        for (let index = 0; index < next.length; index++) {
            next[index] =
                total > 0
                    ? (100 / total) * (next[index] ?? 0)
                    : 100 / next.length;
        }
    }

    let remaining = 0;
    constraints.forEach((item, index) => {
        const unsafe = next[index] ?? 0;
        const safe = validatePanelSize({
            constraints: item,
            prevSize: prev[index] ?? 0,
            size: unsafe,
            overrideDisabled: true,
        });
        if (unsafe !== safe) {
            remaining += unsafe - safe;
            next[index] = safe;
        }
    });

    if (!layoutNumbersEqual(remaining, 0)) {
        for (const [index, item] of constraints.entries()) {
            const prevSize = next[index] ?? 0;
            const safe = validatePanelSize({
                constraints: item,
                prevSize,
                size: prevSize + remaining,
                overrideDisabled: true,
            });
            if (prevSize !== safe) {
                remaining -= safe - prevSize;
                next[index] = safe;
                if (layoutNumbersEqual(remaining, 0)) {
                    break;
                }
            }
        }
    }

    const result: Layout = {};
    constraints.forEach(({ panelId }, index) => {
        result[panelId] = next[index] ?? 0;
    });
    return result;
}
