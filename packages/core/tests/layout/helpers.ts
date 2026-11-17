import type { ResolvedConstraints } from "../../src/layout/types";

/** Panels "a", "b", … with these constraints over the defaults (no constraint). */
export function panels(
    partials: Partial<Omit<ResolvedConstraints, "panelId">>[],
): ResolvedConstraints[] {
    return partials.map((partial, index) => ({
        panelId: String.fromCharCode(97 + index),
        minSize: 0,
        maxSize: 100,
        defaultSize: undefined,
        collapsible: false,
        collapsedSize: 0,
        collapsedThreshold: undefined,
        disabled: false,
        groupResizeBehavior: "preserve-relative-size",
        ...partial,
    }));
}
