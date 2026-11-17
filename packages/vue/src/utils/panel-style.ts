import { parseSize, type SizeValue } from "@fragiola/splitter";
import type { CSSProperties } from "vue";

/**
 * A panel's structural style (D6): a flex item whose grow factor is its size in percent, so the
 * panels share the group's space by their layout and server rendering gives the same sizes. Before
 * its size is known (a panel the model has not registered yet, with no saved or given layout), a
 * panel with a `defaultSize` takes it as its flex basis (any unit) and the others share the rest,
 * which is the default layout: what the first client render shows until the panel registers.
 */
export function panelStyle(
    size: number | undefined,
    defaultSize: SizeValue | undefined,
): CSSProperties {
    if (size !== undefined) {
        return {
            flexGrow: size,
            flexShrink: 1,
            flexBasis: 0,
            overflow: "hidden",
        };
    }
    const parsed =
        defaultSize === undefined ? undefined : parseSize(defaultSize);
    if (parsed) {
        return {
            flexGrow: 0,
            flexShrink: 1,
            flexBasis: `${parsed.value}${parsed.unit}`,
            overflow: "hidden",
        };
    }
    return { flexGrow: 1, flexShrink: 1, flexBasis: 0, overflow: "hidden" };
}
