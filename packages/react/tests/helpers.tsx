import { fireEvent } from "@testing-library/react";
import { afterEach, vi } from "vitest";

/** Every element of a part, in document order. */
export function parts(
    container: HTMLElement,
    part: "group" | "panel" | "separator",
): HTMLElement[] {
    return [
        ...container.querySelectorAll<HTMLElement>(
            `[data-splitter-part="${part}"]`,
        ),
    ];
}

/** The one element of a part at a path. */
export function at(container: HTMLElement, path: string): HTMLElement {
    const element = container.querySelector<HTMLElement>(
        `[data-splitter-path="${path}"]`,
    );
    if (!element) throw new Error(`nothing at ${path}`);
    return element;
}

/** Each panel's flex grow factor, in document order (its size in percent once registered). */
export function grows(container: HTMLElement): number[] {
    return parts(container, "panel").map((panel) =>
        Number(panel.style.flexGrow),
    );
}

/** Presses a key on an element, as a focused separator receives it. */
export function press(element: HTMLElement, key: string): void {
    fireEvent.keyDown(element, { key });
}

/**
 * Gives every panel a client rect `size` pixels wide and high, so a pointer drag has an axis size
 * to divide by (jsdom lays nothing out). Restored after the test.
 */
export function stubPanelRects(size = 500): void {
    const original = HTMLElement.prototype.getBoundingClientRect;
    vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(
        function (this: HTMLElement) {
            if (this.dataset.splitterPart === "panel") {
                return {
                    width: size,
                    height: size,
                    x: 0,
                    y: 0,
                    top: 0,
                    left: 0,
                    right: size,
                    bottom: size,
                    toJSON: () => ({}),
                } as DOMRect;
            }
            return original.call(this);
        },
    );
}

afterEach(() => {
    vi.restoreAllMocks();
});

/** Dispatches a primary mouse pointer event. */
export function pointer(
    target: HTMLElement,
    type: string,
    init: PointerEventInit = {},
): void {
    target.dispatchEvent(
        new PointerEvent(type, {
            bubbles: true,
            cancelable: true,
            pointerId: 1,
            isPrimary: true,
            pointerType: "mouse",
            button: 0,
            ...init,
        }),
    );
}
