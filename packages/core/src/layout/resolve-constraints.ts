import type { PanelConstraints } from "../state/types";
import type { SizeValue } from "../units/parse-size";
import { type GroupMeasure, sizeToPercentage } from "../units/resolve-size";
import type { ResolvedConstraints } from "./types";

function resolve(
    size: SizeValue | undefined,
    measure: GroupMeasure | undefined,
): number | undefined {
    return size === undefined ? undefined : sizeToPercentage(size, measure);
}

/**
 * A panel's declared constraints in percent of its group, with what the group measured. A size
 * that cannot be resolved (pixels before a measure) counts as absent. Pure.
 */
export function resolveConstraints(
    panelId: string,
    declared: PanelConstraints,
    measure: GroupMeasure | undefined,
): ResolvedConstraints {
    const minSize = Math.min(100, resolve(declared.minSize, measure) ?? 0);
    const maxSize = Math.max(
        minSize,
        Math.min(100, resolve(declared.maxSize, measure) ?? 100),
    );
    const collapsible = declared.collapsible === true;
    return {
        panelId,
        minSize,
        maxSize,
        defaultSize: resolve(declared.defaultSize, measure),
        collapsible,
        collapsedSize: Math.min(
            minSize,
            resolve(declared.collapsedSize, measure) ?? 0,
        ),
        collapsedThreshold: resolve(declared.collapsedThreshold, measure),
        disabled: declared.disabled === true,
        groupResizeBehavior:
            declared.groupResizeBehavior ?? "preserve-relative-size",
    };
}
