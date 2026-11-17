import type { Layout } from "./types";
import { validateLayout } from "./validate-layout";

/**
 * A layout scaled so that its sizes sum to 100, without constraints: exactly `panelIds` (in
 * order; a missing one counts as 0, an extra one is dropped), rounded like every layout number.
 * Pure.
 */
export function normalizeLayout(
    layout: Layout,
    panelIds: readonly string[],
): Layout {
    return validateLayout(
        layout,
        panelIds.map((panelId) => ({
            panelId,
            minSize: 0,
            maxSize: 100,
            defaultSize: undefined,
            collapsible: false,
            collapsedSize: 0,
            collapsedThreshold: undefined,
            disabled: false,
            groupResizeBehavior: "preserve-relative-size",
        })),
    );
}
