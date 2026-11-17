import { flushPromises, mount, type VueWrapper } from "@vue/test-utils";
import { vi } from "vitest";
import { type Component, defineComponent, type VNodeChild } from "vue";

/**
 * Mounts `render()` as an app in the document (focus and events need it) and lets Vue settle:
 * the parts register after they mount, and render again with their paths.
 */
export async function render(
    renderApp: () => VNodeChild,
): Promise<{ container: HTMLElement; wrapper: VueWrapper }> {
    return mountApp(defineComponent({ setup: () => () => renderApp() }));
}

/** Mounts a component as an app in the document, then lets Vue settle. */
export async function mountApp(
    component: Component,
    props?: Record<string, unknown>,
): Promise<{ container: HTMLElement; wrapper: VueWrapper }> {
    const host = document.createElement("div");
    document.body.append(host);
    const wrapper = mount(component, { props, attachTo: host });
    await settle();
    // the element the app is mounted in (Vue Test Utils makes one inside the host)
    const container = host.firstElementChild as HTMLElement;
    return { container, wrapper };
}

/** Lets Vue patch and run its post-render hooks and watchers, however many rounds they take. */
export async function settle(): Promise<void> {
    await flushPromises();
}

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

/** Presses a key on an element, as a focused separator receives it, and lets Vue patch. */
export async function press(element: HTMLElement, key: string): Promise<void> {
    element.dispatchEvent(
        new KeyboardEvent("keydown", { key, bubbles: true, cancelable: true }),
    );
    await settle();
}

/** Double clicks an element and lets Vue patch. */
export async function doubleClick(element: HTMLElement): Promise<void> {
    element.dispatchEvent(
        new MouseEvent("dblclick", { bubbles: true, cancelable: true }),
    );
    await settle();
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

/** Dispatches a primary mouse pointer event, then lets Vue patch. */
export async function pointer(
    target: HTMLElement,
    type: string,
    init: PointerEventInit = {},
): Promise<void> {
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
    await settle();
}
