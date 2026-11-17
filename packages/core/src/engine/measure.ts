import type { GroupMeasurePayload } from "../commands/types";
import type { Orientation } from "../state/types";

/** The window an element renders in, if any (never the global one). */
export function viewOf(element: Element): Window | undefined {
    return element.ownerDocument.defaultView ?? undefined;
}

/** An element's computed inline direction. */
export function directionOf(element: Element): "ltr" | "rtl" {
    const view = viewOf(element);
    return view?.getComputedStyle(element).direction === "rtl" ? "rtl" : "ltr";
}

function fontSizeOf(view: Window, element: Element): number | undefined {
    const size = Number.parseFloat(view.getComputedStyle(element).fontSize);
    return Number.isFinite(size) && size > 0 ? size : undefined;
}

/**
 * What a group measures on screen, for `group.measure`: the sum of its panels' layout sizes along
 * its orientation (the group's own size when no panel is bound), its font size, the root's, and
 * the viewport.
 */
export function measureGroup(
    groupId: string,
    groupElement: HTMLElement,
    panelElements: readonly HTMLElement[],
    orientation: Orientation,
): GroupMeasurePayload {
    const horizontal = orientation === "horizontal";
    const sizeOf = (element: HTMLElement) =>
        horizontal ? element.offsetWidth : element.offsetHeight;
    const axisSize =
        panelElements.length > 0
            ? panelElements.reduce((sum, element) => sum + sizeOf(element), 0)
            : sizeOf(groupElement);
    const view = viewOf(groupElement);
    const measure: {
        -readonly [K in keyof GroupMeasurePayload]: GroupMeasurePayload[K];
    } = { groupId, axisSize: Math.max(0, axisSize) };
    if (view) {
        const fontSize = fontSizeOf(view, groupElement);
        const rootFontSize = fontSizeOf(
            view,
            groupElement.ownerDocument.documentElement,
        );
        if (fontSize !== undefined) {
            measure.fontSize = fontSize;
        }
        if (rootFontSize !== undefined) {
            measure.rootFontSize = rootFontSize;
        }
        if (view.innerWidth > 0) {
            measure.viewportWidth = view.innerWidth;
        }
        if (view.innerHeight > 0) {
            measure.viewportHeight = view.innerHeight;
        }
    }
    return measure;
}

/**
 * The group's size along its orientation in pointer (client) coordinates: what a pointer's
 * movement is divided by. It differs from the layout size under a CSS zoom or a scale transform.
 */
export function clientAxisSize(
    groupElement: HTMLElement,
    panelElements: readonly HTMLElement[],
    orientation: Orientation,
): number {
    const horizontal = orientation === "horizontal";
    const sizeOf = (element: HTMLElement) => {
        const rect = element.getBoundingClientRect();
        return horizontal ? rect.width : rect.height;
    };
    return panelElements.length > 0
        ? panelElements.reduce((sum, element) => sum + sizeOf(element), 0)
        : sizeOf(groupElement);
}
